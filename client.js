let progress = 0
let statusElement = null
let intervalID = 0

const getResults = async ( event ) => {
	// event.preventDefault()
	const form = document.querySelector( '#resultForm' )
	const data = new URLSearchParams()
	for ( const pair of new FormData( form ) ) {
		data.append( pair[0], pair[1] )
	}
	console.log( data )
	let results = await( fetch( '/test', {
		method: 'post',
		body: data
	} ) )
	clearInterval( intervalID )
}

const getUpdate = async () => {
	let update = await( fetch( '/update' ) )
	statusElement.innerHTML = update
}

window.onload = () => {
	const btn = document.querySelector( '#resultSubmit' )
	statusElement = document.querySelector( '#status' )
	intervalID = setInterval( async () => {
		await getUpdate()
	}, 1000 )
	btn.addEventListener( 'click', getResults  )
}