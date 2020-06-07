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

const getUserDetails = async ( job ) => {
	const resultArray = job.data.resultArray
	const token = job.data.token
	const quizType = job.data.quizType
	puntentotaal = job.data.puntentotaal
	pointsPossible = job.data.pointsPossible
	mcType = job.data.mcType
	olodType = job.data.olodType
	let rows = []
	resultArray.forEach( async ( single_result ) => {
		// console.log( 'single', single_result )
		const user_id = single_result.user_id
		if ( ! single_result.score && ! single_result.entered_grade ) {
			return	
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
			console.log( 'row', row )
			rows.push( row )
			}					
		catch ( e ) {
			// res.send( e )
			console.log(e)
		}	
	} )
	return rows
}

const start = () => {
	workQueue.process( maxJobsPerWorker, async ( job ) => {
		// console.log( job )
		console.log( 'start process' )
		const result = await getUserDetails( job )
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
	return tmp <= 0 ? 0 : roundScore( tmp, 2 )
}

const roundScore = ( x, n ) => {
	let factor = parseFloat( Math.pow( 10, n ) )
	return Math.trunc( x * factor + 0.5 ) / factor
}

const roundTo = ( n, to ) => {
	return to * Math.round( n / to );
}

throng( { workers, start } )