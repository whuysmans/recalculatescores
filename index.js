const express = require('express')
const app = express()
const port = 3000
const axios = require('axios')
const { baseURL } = require('./creds')
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

app.get('/', ( req, res ) => {
	res.sendFile( path.join( __dirname + '/index.html' ) )
} )

app.get('/test', async ( req, res ) => {
	assignmentID = req.query.assignment
	courseID = req.query.course
	mcType = req.query.mcselect
	puntentotaal = req.query.puntentotaal
	quizType = req.query.typeselect
	token = `Bearer ${ req.query.token }`
	let assignmentURL = quizType === 'quiz' ? `${ baseURL }courses/${ courseID }/quizzes/${ assignmentID }` :
		`${ baseURL }courses/${ courseID }/assignments/${ assignmentID }`
	try {
		const assignment = await axios({
			method: 'get',
			url: assignmentURL,
			headers: {
				'Authorization': token
			}
		})
		// console.log( assignment.data )
		pointsPossible = assignment.data.points_possible
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
						'Authorization': token
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
							'Authorization': token
						}
					} )
					let row = []
					let points = quizType === 'quiz' ? single_result.score : single_result.entered_grade
					let newScore = recalculateScore( parseFloat( points ) )
					row.push( 
						user_details.data.sortable_name ? user_details.data.sortable_name : 'onbekend',
						user_details.data.name ? user_details.data.name : 'onbekend', 
						user_details.data.email ? user_details.data.email : 'onbekend',
						points,
						newScore 
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

const recalculateScore = ( score ) => {
	let ces = mcType === 'MC4' ? 0.625 : 0.6667
	let tellerLeft = Math.round( score / pointsPossible * puntentotaal )
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

const writeExcel = ( rows ) => {
	console.log( rows.length )
	console.log( rows )
	
	let data = [ [ 'sorteernaam', 'naam', 'email', 'originele score', 'herberekende score' ] ]
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

app.listen( port, () => console.log( `listening on port ${ port }` ) )