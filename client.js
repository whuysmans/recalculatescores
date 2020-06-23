let progress = 0
let intervalID = 0
let downloadLink = null
let refreshLink = null
let progressElement = null

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
	if ( response.progress === 100 ) {
		clearInterval( intervalID )
		downloadLink.style.visibility = 'visible'
	}
	progressElement.value = response.progress
	progressElement.innerHTML = response.progress
}

const clearForm = () {
	const form = document.querySelector( '#resultForm' )
	const elements = form.elements
	for ( let i = 0; i < elements.length; i++ ) {
		let item = elements.item(i)
		item.value = ''
		elements.item(0).focus()
	}
}

window.onload = () => {
	const btn = document.querySelector( '#resultSubmit' )
	const form = document.querySelector( '#scoreForm' )
	downloadLink = document.querySelector( '#downloadLink' )
	refreshLink = document.querySelector( '#refreshLink' )
	progressElement = document.querySelector( '#progress' )
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
		fetch( '/reset' )
		downloadLink.style.visibility = 'hidden'
		intervalID = setInterval( getUpdate, 1000 )
	} )
	downloadLink.style.visibility = 'hidden'
	// downloadLink.addEventListener( 'click', ( event ) => {
	// 	fetch( '/download' )
	// } )
}