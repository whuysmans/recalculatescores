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
let Queue = require('bull')
let REDIS_URL = process.env.REDIS_URL
let workQueue = new Queue( 'work', REDIS_URL )

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
		if ( req.query.state !== state ) {
			return res.sendStatus( 401 )
		}
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
		const getResultsFromWorkers = async () => {
			let keepGoing = true
			let results = []
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
				// resultArray.map( ( resultObject ) => {
				// 	result.push( resultObject )
				// } )
				// app.post( '/job', async ( req, res ) => {
					let job = await workQueue.add( { 
						resultArray: resultArray, 
						token: token, 
						quizType: quizType,
						mcType: mcType,
						pointsPossible: pointsPossible,
						puntentotaal: puntentotaal,
						olodType: olodType
					} )
					let result = res.json()
					console.log( result )
					// console.log( 'result', res )
					results.push( result )
				// } )
				let parsed = parse( response.headers.link )
				if ( parseInt( parsed.current.page ) >= parseInt( parsed.last.page ) ) {
					// console.log( parsed.current )
					keepGoing = false
				} else {
					submissionsURL = parsed.next.url
				}
			}
			// console.log( 'results', results )
			return results
		}
		const data = await getResultsFromWorkers()
		// console.log( 'data', data )
		writeExcel( data )
		res.download( './text.xlsx' )
		// res.status( 200 ).send( rows )
	}
	catch ( err ) {
		// res.send( err )
	}
} )


const getRandomIdent = () => {
	return Math.random().toString(36).substring(4)
}

const writeExcel = ( rows ) => {
	console.log( 'length', rows.length )
	// console.log( rows )
	
	let data = [ [ 'sorteernaam', 'naam', 'email', 'originele score', 'herberekende score', 'afgeronde score' ] ]
	rows.forEach( ( row ) => {
		data.push( row )
	} )
	// console.log( 'data', data )
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