const express = require('express')
const app = express()
const port = 3000
const axios = require('axios')
const baseURL = 'https://canvas.kdg.be/api/v1/'
let assignmentID = 0
let courseID = 0
const { token } = require('./creds') 
const XLSX = require('xlsx')
const FileSaver = require('file-saver')
const path = require('path')
let pointsPossible = 10
let mcType = 'MC4'
let numberOfQuestions = 1

app.get('/', ( req, res ) => {
	res.sendFile( path.join( __dirname + '/index.html' ) )
} )

app.get('/test', async ( req, res ) => {
	assignmentID = req.query.assignment
	courseID = req.query.course
	mcType = req.query.mcselect
	numberOfQuestions = req.query.questions
	try {
		const assignment = await axios({
			method: 'get',
			url: `${ baseURL }courses/${ courseID }/assignments/${ assignmentID }`,
			headers: {
				'Authorization': token
			}
		})
		pointsPossible = assignment.data.pointsPossible
		console.log( pointsPossible )
		const result = await axios({
			method: 'get',
			url: `${ baseURL }courses/${ courseID }/assignments/${ assignmentID }/submissions`,
			headers: {
				'Authorization': token
			}
		})
		console.log('ok')
		const getAll = async ( data ) => {
			let rows = []
			for ( const single_result of data ) {
				const user_id = single_result.user_id
				try {
					const user_details = await axios( {
						method: 'get',
						url: `${ baseURL }users/${ user_id }`,
						headers: {
							'Authorization': token
						}
					} )
					let row = []
					let newScore = single_result.entered_grade ? recalculateScore( single_result.entered_grade ) : 0
					row.push( user_details.data.name ? user_details.data.name : 'onbekend', 
						user_details.data.email ? user_details.data.email : 'onbekend',
						single_result.entered_grade ? parseInt( single_result.entered_grade ) : 0,
						newScore)
					rows.push( row )
				}
				catch ( e ) {
					// res.send( e )
					console.log(e)
				}	
			}
			return rows
		}
		const rows = await getAll( result.data )	
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
	let intScore = parseInt( score )
	let noemer = mcType === 'MC4' ? 4 : 3
	let cesuur = ( ( numberOfQuestions - ( numberOfQuestions / noemer ) ) / 2 ) + ( numberOfQuestions / noemer )
	return Math.round( 10 + ( ( 10 / ( numberOfQuestions - cesuur ) ) * ( intScore - cesuur ) ) )
}

const writeExcel = ( rows ) => {
	console.log( rows.length )
	console.log( rows )
	
	let data = [ [ 'naam', 'email', 'originele score', 'hereberekende score' ] ]
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