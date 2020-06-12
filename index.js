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
let answerRes = null
let statusElement = null
let job = null
let intervalID = null
const { Server } = require( 'ws' )



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
	res.render( 'index', { progress: 0 } )
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
	answerRes = res
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
				job = await workQueue.add( { 
				token: token, 
				quizType: quizType,
				mcType: mcType,
				pointsPossible: pointsPossible,
				puntentotaal: puntentotaal,
				olodType: olodType,
				courseID: courseID,
				assignmentID: assignmentID
			} )
			// console.log( 'results', results )
		}
		getResultsFromWorkers()
		workQueue.on( 'global:completed', ( jobId, result ) => {
			console.log(`Job completed with result ${ result }`)
			writeExcel( result )
			clearInterval( intervalID )
			res.download( './text.xlsx' )
		} )	
		// console.log( 'data', data )
		
		// res.status( 200 ).send( rows )
	}
	catch ( err ) {
		// res.send( err )
	}
} )


const getRandomIdent = () => {
	return Math.random().toString(36).substring(4)
}



const writeExcel = ( result ) => {
	const rows = JSON.parse( result )
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




const server = app.listen( port, () =>  {
	console.log( `listening on port ${ port }` )
	state = getRandomIdent()
	oauth2 = require('simple-oauth2').create( credentials )
	authorizationUri = oauth2.authorizationCode.authorizeURL( {
		redirect_uri: `${ process.env.APPURL }/callback`,
		scope: '',
		state: state
	} )

} )

const wss = new Server( { server } )
wss.on( 'connection', ( ws ) => {
	console.log( 'client connected' )
	intervalID = setInterval( () => {
		wss.clients.forEach( ( client ) => {
			if ( job ) {
				client.send( `Progress: ${ 100 / job.progress }` );
			} 
		});
	 }, 1000);
} )

 

app.use( '/css', express.static( path.join( __dirname, 'css' ) ) )
app.get('/index.js', (req, res) => res.sendFile('index.js', { root: __dirname }));
app.set( 'view engine', 'pug' )