let progress = 0
let statusElement = null
let intervalID = 0
let downloadLink = null
let refreshLink = null

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
	fetch( '/test', {
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
	let update = await fetch( '/update' )
	let response = await update.json()
	console.log( 'update', response )
	if ( response.progress === 'complete' ) {
		downloadLink.style.visibility = 'visible'
	}
	statusElement.innerHTML = `${ new Date().toTimeString() } - ${ response.progress }`
}

window.onload = () => {
	const btn = document.querySelector( '#resultSubmit' )
	const form = document.querySelector( '#scoreForm' )
	downloadLink = document.querySelector( '#downloadLink' )
	refreshLink = document.querySelector( '#refreshLink' )
	statusElement = document.querySelector( '#status' )
	intervalID = setInterval( getUpdate, 1000 )
	btn.addEventListener( 'click', ( event ) => {
		// form.remove()
		console.log( 'clicked!' )
		getResults( event )
	} )
	refreshLink.addEventListener( 'click', ( event ) => {
		// form.remove()
		event.preventDefault()
		console.log( 'refresh clicked!' )
		clearInterval( intervalID )
		fetch( '/reset' )
	} )
	downloadLink.style.visibility = 'hidden'
	// downloadLink.addEventListener( 'click', ( event ) => {
	// 	fetch( '/download' )
	// } )
}