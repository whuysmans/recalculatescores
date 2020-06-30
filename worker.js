let throng = require( 'throng' )
let Queue = require('bull')
const axios = require('axios')
let port = process.env.PORT || 3000
let school = process.env.SCHOOL
const baseURL = `${ school }/api/graphql`
const events = require('events')
const { GraphQLClient } = require('graphql-request')
const fetch = require( 'node-fetch' )

let REDIS_URL = process.env.REDIS_URL
let workers = process.env.WEB_CONCURRENCY || 2
let maxJobsPerWorker = 100
let pointsPossible = -1
let puntentotaal = 0
let mcType = ''
let olodType = 'eolod'
let workQueue = new Queue( 'workprodgraphql', REDIS_URL )
let assignmentID = 0
let token = ''
let quizType = ''

const getAllData = async ( job ) => {
	token = job.data.token
	puntentotaal = job.data.puntentotaal
	mcType = job.data.mcType
	olodType = job.data.olodType
	assignmentID = job.data.assignmentID
	let rows = []
	let keepGoing = true
	const graphQLClient = new GraphQLClient( baseURL, {
		headers: {
			authorization: `Bearer ${ token }`
		}
	} )
	const query = `
	query getAllData( $id: ID!, $first: Int!, $after: String )
		assignment(id: $id) {
			quiz {
			_id
			}
			submissionsConnection(first: $first, after: $after, orderBy: { field: username }) {
			edges {
				cursor
				node {
					grade
					user {
					email
					name
					sortableName
					}
				}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
			}
			pointsPossible
		}
	}
	`
	let variables = {
		id: assignmentID,
		first: 50,
		after: ""
	}
	while ( keepGoing ) {
		try {
			console.log( 'start query' )
			let response = await graphQLClient.request( {
				query,
				variables
			} )
			console.log( 'first round' )
			// console.log( response )
			let resultArray = response.data.assignment.submissionsConnection.edges
			if ( ! pointsPossible ) {
				pointsPossible = response.data.assignment.pointsPossible
			} 
			resultArray.map( ( resultObject ) => {
				let row = []
				let correctedScore = recalculateScore( parseFloat( resultObject.node.grade ) )
				let afgerondeScore = olodType === 'dolod' ? roundTo( correctedScore, 0.1 ) : roundTo( correctedScore, 1 )
				row.push( 
					resultObject.node.user.sortableName,
					resultObject.node.user.name,
					resultObject.node.user.email,
					resultObject.node.grade,
					correctedScore,
					afgerondeScore
				)
				rows.push( row )
			} )
			if ( ! response.data.assignment.submissionsConnection.pageInfo.hasNextPage ) {
				keepGoing = false
			} else {
				variables.after = response.data.assignment.submissionsConnection.pageInfo.endCursor
			}
		} catch ( err ) {
			console.log( err )
		}
	}
	return rows 
}
		
const start = () => {
	workQueue.process( maxJobsPerWorker, async ( job ) => {
		// console.log( job )
		console.log( 'start process' )
		const result = getAllData( job )
		return result
	} )	
}

const recalculateScore = ( score ) => {
	let ces = mcType === 'MC4' ? 0.625 : 0.6667
	let tellerLeft = score / pointsPossible * puntentotaal
	let tellerRight = puntentotaal * ces
	let noemer = puntentotaal - ( puntentotaal * ces )
	let lastFactor = puntentotaal / 2
	let herberekendeScore = puntentotaal / 2 + ( tellerLeft - tellerRight ) / noemer * lastFactor
	let tmp = roundScore( herberekendeScore, 4 )
	return tmp <= 0 ? 0 : ( mcType === 'MC4' ? tmp : roundScore( tmp, 2 ) )
}

const roundScore = ( x, n ) => {
	let factor = parseFloat( Math.pow( 10, n ) )
	return Math.trunc( x * factor + 0.5 ) / factor
}

const roundTo = ( n, to ) => {
	return to * Math.round( n / to );
}

throng( { workers, start } )