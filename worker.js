let throng = require( 'throng' )
let Queue = require('bull')
const axios = require('axios')
let port = process.env.PORT || 3000
let school = process.env.SCHOOL
const baseURL = `${ school }/api/v1/`

let REDIS_URL = process.env.REDIS_URL
let workers = process.env.WEB_CONCURRENCY || 2
let maxJobsPerWorker = 100
let pointsPossible = 0
let puntentotaal = 0
let mcType = ''
let olodType = 'eolod'
let workQueue = new Queue( 'work', REDIS_URL )
let courseID = 0
let assignmentID = 0
const parse = require('parse-link-header')
let token = ''
let quizType = ''

const getSubmissions = async ( job ) => {
	token = job.data.token
	quizType = job.data.quizType
	puntentotaal = job.data.puntentotaal
	pointsPossible = job.data.pointsPossible
	mcType = job.data.mcType
	olodType = job.data.olodType
	courseID = job.data.courseID
	assignmentID = job.data.assignmentID
	let rows = []
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
			keepGoing = false
		} else {
			submissionsURL = parsed.next.url
		}
	}
	return result
}

const getUserDetails = async ( job ) => {
	const result = await getSubmissions( job )
	let rows = []
	for ( const single_result of result ) {
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
		let result = null
		let progress = 0
		while( ! result || result.length === 0 ) {
			progress++
			job.progress( progress )
		}
		result = await getUserDetails( job )

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