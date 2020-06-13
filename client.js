let progress = 0
let statusElement = null
let intervalID = 0

const getResults = async ( event ) => {
	// event.preventDefault()
	const form = document.querySelector( '#resultForm' )
	const formData = new FormData( form )
	console.log( formData )
	let results = await( fetch( '/test', formData ) )
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