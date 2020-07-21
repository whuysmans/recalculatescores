const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
let port = process.env.PORT || 3000
const axios = require('axios')
let school = process.env.SCHOOL
let assignmentID = 0
let token = '' 
const XLSX = require('xlsx')
const FileSaver = require('file-saver')
const path = require('path')
const helmet = require('helmet')
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
let job = null
let result = null
let p = 0


app.get('/', ( req, res ) => {
	res.send('<body><div id="main"><h2 class="form"><a href="/auth">Login via Canvas</a></h2></div></body>')
} )

app.get('/auth', ( req, res ) => {
	res.redirect( authorizationUri )
} )

app.get( '/callback', async ( req, res ) => {
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
	if ( token === '' ) {
		return res.redirect( '/' )
	}
	res.render( 'index', { progress: p } )
} )

app.post('/scores', jsonParser, [
	check( 'assignment' ).isLength({ min: 1, max: 10 }),
	check( 'assignment' ).isNumeric(),
	check( 'mcselect' ).isLength({ min: 3, max: 3 }),
	check( 'puntentotaal' ).isNumeric(),
	check( 'olodselect' ).isLength({ min: 4, max: 5 })
], async ( req, res, next ) => {
	if ( token === '' ) {
		return res.redirect( '/' )
	}
	console.log( 'received' )
	const errors = validationResult( req )
	if ( ! errors.isEmpty() ) {
		return res.status( 422 ).json( { errors: errors.array() } )
	}
	assignmentID = req.body.assignment
	mcType = req.body.mcselect
	puntentotaal = req.body.puntentotaal
	olodType = req.body.olodselect
	const getResultsFromWorkers = async () => {
		console.log( 'get the results' )
		console.log( 'token', token )
		job = await workQueue.add( { 
			token: token, 
			mcType: mcType,
			puntentotaal: puntentotaal,
			olodType: olodType,
			assignmentID: assignmentID
		} )
	}
	p = 1
	res.redirect( '/start' )
	await getResultsFromWorkers()
} )

const getRandomIdent = () => {
	return Math.random().toString(36).substring(4)
}

app.get( '/update', async ( req, res ) => {
	if ( job ) {
		res.json( { progress: p } )
	} else {
		res.json( { progress: 0 } )
	}
} )



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

app.get( '/logout', async ( req, res ) => {
	let logoutURL = `${ school }/login/oauth2/token`
	console.log( logoutURL )
	await axios.delete( logoutURL, { headers: { 'Authorization': `Bearer ${ token }`	} } )
	token = ''
} )


const server = app.listen( port, () =>  {
	console.log( `listening on port ${ port }` )
	state = getRandomIdent()
	oauth2 = require('simple-oauth2').create( credentials )
	authorizationUri = oauth2.authorizationCode.authorizeURL( {
		redirect_uri: `${ process.env.APPURL }/callback`,
		// scope: `url:GET|/api/v1/courses/:course_id/assignments/:id url:GET|/api/v1/courses/:course_id/quizzes/:id url:GET|/api/v1/courses/:course_id/quizzes/:quiz_id/submissions url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions url:GET|/api/v1/users/:id`,
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
	if ( token === '' ) {
		return res.redirect( '/' )
	}
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
app.use( helmet.frameguard( { action: 'DENY' } ) )
app.get('/client.js', (req, res) => res.sendFile('client.js', { root: __dirname }));
app.set( 'view engine', 'pug' )