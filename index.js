const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
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
let p = 0
const { Server } = require( 'ws' )
let result = null
const fetch = require( 'node-fetch' )



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
	res.render( 'index', { progress: p } )
} )

app.post('/test', jsonParser, [
	check( 'course' ).isLength({ min: 4, max: 10 }),
	check( 'course' ).isNumeric(),
	check( 'assignment' ).isLength({ min: 4, max: 10 }),
	check( 'assignment' ).isNumeric(),
	check( 'mcselect' ).isLength({ min: 3, max: 3 }),
	check( 'puntentotaal' ).isNumeric(),
	check( 'olodselect' ).isLength({ min: 4, max: 5 })
], async ( req, res, next ) => {
	console.log( 'received' )
	const errors = validationResult( req )
	answerRes = res
	if ( ! errors.isEmpty() ) {
		return res.status( 422 ).json( { errors: errors.array() } )
	}
	assignmentID = req.body.assignment
	courseID = req.body.course
	mcType = req.body.mcselect
	puntentotaal = req.body.puntentotaal
	quizType = req.body.typeselect
	olodType = req.body.olodselect
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
		
		res.redirect( '/start' )
		getResultsFromWorkers()
		// res.redirect( '/results' )
		// console.log( 'data', data )
		
		// res.status( 200 ).send( rows )
	}
	catch ( err ) {
		res.send( err )
	}
} )

app.post( '/test', ( req, res ) => {

	console.log( 'next test' )
	
} )

app.get( '/update', async ( req, res ) => {
	if ( job ) {
		res.json( { progress: p } )
	} else {
		res.json( { progress: 0 } )
	}
} )


const getRandomIdent = () => {
	return Math.random().toString(36).substring(4)
}



const writeExcel = ( result ) => {
	console.log( 'write order received' )
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

workQueue.on( 'global:completed', ( jobId, apiResult ) => {
	console.log(`Job completed with result ${ apiResult }`)
	result = apiResult
	writeExcel( result )
} )
workQueue.on( 'global:progress', ( jobId, progress ) => {
	p = progress
} )

app.get( '/download', ( req, res ) => {
	// res.setHeader( 'Access-Control-Allow-Origin', req.headers.origin )
	console.log("ok")
	res.download( './text.xlsx' )
} )

app.get( '/reset', async ( req, res ) => {
	// await cleanQueue()
	job = null
	p = 0
	await cleanQueue()
	res.redirect( '/start' )
} )

const cleanQueue = async () => {
	await workQueue.empty()
	await workQueue.clean( 0, 'active' )
	await workQueue.clean( 0, 'completed' )
	await workQueue.clean( 0, 'delayed' )
	await workQueue.clean( 0, 'failed' )
}

app.use( '/css', express.static( path.join( __dirname, 'css' ) ) )
app.get('/client.js', (req, res) => res.sendFile('client.js', { root: __dirname }));
app.set( 'view engine', 'pug' )