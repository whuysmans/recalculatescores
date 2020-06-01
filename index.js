const express = require('express')
const app = express()
let port = process.env.PORT || 3000
const axios = require('axios')
let school = process.env.SCHOOL
let assignmentID = 0
let courseID = 0
let token = '' 
const XLSX = require('xlsx')
const FileSaver = require('file-saver')
const path = require('path')
const parse = require('parse-link-header')
let pointsPossible = 10
let mcType = 'MC4'
let puntentotaal = 1
let quizType = 'quiz'
let olodType = 'eolod'
let state = '' 
const credentials = {
	client: {
		id: process.env.CLIENTID,
		secret: process.env.SECRET
	},
	auth: {
		tokenHost: process.env.SCHOOL,
		authorizePath: '/login/oauth2/auth',
		tokenPath: '/login/oauth2/token'
	}
}
let oauth2 = null
let authorizationUri = null
const { check, validationResult } = require('express-validator')

app.get('/', ( req, res ) => {
	res.send('<h2 class="form"><a href="/auth">Login via Canvas</a></h2>')
} )

app.get('/auth', ( req, res ) => {
	res.redirect( authorizationUri )
} )

app.get('/callback', async ( req, res ) => {
	const { code } = req.query
	const options = {
		code
	}
	try {
		const result = await oauth2.authorizationCode.getToken( options )
		const tokenObj = oauth2.accessToken.create( result )
		token = tokenObj.token.access_token
		console.log( res )
		// if ( res.query.state !== state ) {
		// 	return res.sendStatus( 401 )
		// }
		res.redirect('/start')
	} catch ( e ) {
		console.log( e )
	}
} )

app.get( '/start', ( req, res ) => {
	res.sendFile( path.join( __dirname + '/start.html' ) )
} )

app.get('/test', [
	check( 'course' ).isLength({ min: 4, max: 10 }),
	check( 'course' ).isNumeric(),
	check( 'assignment' ).isLength({ min: 4, max: 10 }),
	check( 'assignment' ).isNumeric(),
	check( 'mcselect' ).isLength({ min: 3, max: 3 }),
	check( 'puntentotaal' ).isNumeric(),
	check( 'olodselect' ).isLength({ min: 4, max: 5 })
], async ( req, res ) => {
	const errors = validationResult( req )
	if ( ! errors.isEmpty() ) {
		return res.status( 422 ).json( { errors: errors.array() } )
	}
	assignmentID = req.query.assignment
	courseID = req.query.course
	mcType = req.query.mcselect
	puntentotaal = req.query.puntentotaal
	quizType = req.query.typeselect
	olodType = req.query.olodselect
	baseURL = `${ school }/api/v1/`
	let assignmentURL = quizType === 'quiz' ? `${ baseURL }courses/${ courseID }/quizzes/${ assignmentID }` :
		`${ baseURL }courses/${ courseID }/assignments/${ assignmentID }`
	try {
		const assignment = await axios({
			method: 'get',
			url: assignmentURL,
			headers: {
				'Authorization': `Bearer ${ token }`
			}
		})
		// console.log( assignment.data )
		pointsPossible = parseInt( assignment.data.points_possible )
		const getSubmissions = async () => {
			let keepGoing = true
			let result = []
			let submissionsURL = quizType === 'quiz' ? `${ baseURL }courses/${ courseID }/quizzes/${ assignmentID }/submissions?per_page=50` :
				`${ baseURL }courses/${ courseID }/assignments/${ assignmentID }/submissions?per_page=50`
			while ( keepGoing ) {
				let response = await axios({
					method: 'get',
					url: submissionsURL,
					headers: {
						'Authorization': `Bearer ${ token }`
					}
				})
				const resultArray = quizType === 'quiz' ? response.data.quiz_submissions : response.data
				resultArray.map( ( resultObject ) => {
					result.push( resultObject )
				} )
				let parsed = parse( response.headers.link )
				if ( parseInt( parsed.current.page ) >= parseInt( parsed.last.page ) ) {
					console.log( parsed.current )
					keepGoing = false
				} else {
					submissionsURL = parsed.next.url
				}
			}
			return result
		}
		const result = await getSubmissions()
		const getAll = async ( data ) => {
			let rows = []
			for ( const single_result of data ) {
				const user_id = single_result.user_id
				if ( ! single_result.score && ! single_result.entered_grade ) {
					continue
				}
				try {
					const user_details = await axios( {
						method: 'get',
						url: `${ baseURL }users/${ user_id }`,
						headers: {
							'Authorization': `Bearer ${ token }`
						}
					} )
					let row = []
					let points = quizType === 'quiz' ? single_result.score : single_result.entered_grade
					let correctedScore = recalculateScore( parseFloat( points ) )
					let afgerondeScore = olodType === 'dolod' ? roundTo( correctedScore, 0.1 ) :
						roundTo( correctedScore, 1 )
					row.push( 
						user_details.data.sortable_name ? user_details.data.sortable_name : 'onbekend',
						user_details.data.name ? user_details.data.name : 'onbekend', 
						user_details.data.email ? user_details.data.email : 'onbekend',
						points,
						correctedScore,
						afgerondeScore
					)
					rows.push( row )
					}					
				catch ( e ) {
					// res.send( e )
					console.log(e)
				}	
			}
			return rows
		}
		const rows = await getAll( result )
		// console.log( 'rows', rows )
		writeExcel( rows )
		res.download( './text.xlsx' )
		// res.status( 200 ).send( rows )
	}
	catch ( err ) {
		res.send( err )
	}
} )

const recalculateScore2 = ( score ) => {
	let keuzes = mcType === 'MC4' ? 4 : 3
	let ces =  pointsPossible  * ( ( keuzes + 1 ) / ( 2 * keuzes ) )
	let herberekendeScore = puntentotaal / 2 + ( ( ( puntentotaal / 2 ) / ( pointsPossible - ces ) ) * ( score - ces ) )
	let tmp = roundScore( herberekendeScore, 5 )
	return tmp <= 0 ? 0 : tmp
}

const getRandomIdent = () => {
	return Math.random().toString(36).substring(4)
}

const recalculateScore = ( score ) => {
	let ces = mcType === 'MC4' ? 0.625 : 0.6667
	let tellerLeft = score / pointsPossible * puntentotaal
	let tellerRight = puntentotaal * ces
	let noemer = puntentotaal - ( puntentotaal * ces )
	let lastFactor = puntentotaal / 2
	let herberekendeScore = puntentotaal / 2 + ( tellerLeft - tellerRight ) / noemer * lastFactor
	let tmp = roundScore( herberekendeScore, 4 )
	return tmp <= 0 ? 0 : tmp
}

const roundScore = ( x, n ) => {
	return Math.round( x * Math.pow( 10, n ) ) / Math.pow( 10, n )
}

const roundTo = ( n, to ) => {
	return to * Math.round( n / to );
 }

const writeExcel = ( rows ) => {
	console.log( rows.length )
	console.log( rows )
	
	let data = [ [ 'sorteernaam', 'naam', 'email', 'originele score', 'herberekende score', 'afgeronde score' ] ]
	rows.forEach( ( row ) => {
		data.push( row )
	} )
	console.log( 'data', data )
	let wb = XLSX.utils.book_new()
	wb.Props = {
		Title: "test",
		Subject: "Herberekende punten",
		Author: "Werner Huysmans",
		CreatedDate: new Date()
	}
	wb.SheetNames.push( "Scores" )
	let ws = XLSX.utils.aoa_to_sheet( data )
	wb.Sheets[ "Scores" ] = ws
	// let wbout = XLSX.write( wb, { bookType: 'xlsx', type: 'binary' } )
	// saveAs( new Blob( [ s2ab( wbout ) ], { type: 'application/octet-stream' } ), 'test.xlsx' )
	XLSX.writeFile( wb, 'text.xlsx' )
}

app.listen( port, () =>  {
	console.log( `listening on port ${ port }` )
	state = getRandomIdent()
	oauth2 = require('simple-oauth2').create( credentials )
	authorizationUri = oauth2.authorizationCode.authorizeURL( {
		redirect_uri: `${ process.env.APPURL }/callback`,
		scope: '',
		state: state
	} )

} )

app.use( '/css', express.static( path.join( __dirname, 'css' ) ) )