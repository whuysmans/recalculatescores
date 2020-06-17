let progress = 0
let statusElement = null
let intervalID = 0

const getResults = async ( event ) => {
	event.preventDefault()
	const form = document.querySelector( '#resultForm' )
	const elements = form.elements
	let obj = {}
	for ( let i = 0; i < elements.length; i++ ) {
		let item = elements.item(i)
		obj[item.name] = item.value
	}
	console.log( 'obj', obj )
	await fetch( '/test', {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		 },
		body: JSON.stringify( obj )
	} ) 
	// fetch( '/results' )
	// clearInterval( intervalID )
}

const getUpdate = async () => {
	let update = await( fetch( '/update' ) )
	let response = await update.json()
	console.log( 'update', response )
	if ( response.progress === 'complete' ) {
		clearInterval( intervalID )
	}
	statusElement.innerHTML = `${ new Date().toTimeString() } - ${ response.progress }`
}

window.onload = () => {
	const btn = document.querySelector( '#resultSubmit' )
	const form = document.querySelector( '#scoreForm' )
	statusElement = document.querySelector( '#status' )
	intervalID = setInterval( getUpdate, 500 )
	btn.addEventListener( 'click', () => {
		// form.remove()
		getResults()
	} )
}