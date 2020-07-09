let downloadLink = null
let refreshLink = null
let btn = null
let logoutBtn = null
let progress = 0
let intervalID = 0
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
	fetch( '/scores', {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		 },
		body: JSON.stringify( obj )
	} )
	downloadLink.classList.remove( 'pure-button-disabled' )
}

const getUpdate = async () => {
	let update = await fetch( '/update' )
	let response = await update.json()
	console.log( 'update', response )
	if ( response.progress === 100 ) {
		clearInterval( intervalID )
		downloadLink.classList.remove( 'pure-button-disabled' )
	}
	progressElement.value = response.progress
	progressElement.innerHTML = response.progress
}

const clearForm = () => {
	const form = document.querySelector( '#resultForm' )
	const elements = form.elements
	for ( let i = 0; i < elements.length; i++ ) {
		let item = elements.item(i)
		item.value = ''
		elements.item(0).focus()
	}
	btn.classList.remove( 'pure-button-disabled' )
}

window.onload = () => {
	btn = document.querySelector( '#resultSubmit' )
	const form = document.querySelector( '#scoreForm' )
	downloadLink = document.querySelector( '#downloadLink' )
	refreshLink = document.querySelector( '#refreshLink' )
	progressElement = document.querySelector( '#progress' )
	intervalID = setInterval( getUpdate, 5000 )
	btn.addEventListener( 'click', async ( event ) => {
		console.log( 'clicked!' )
		btn.classList.add( 'pure-button-disabled' )
		getResults( event )
	} )
	refreshLink.addEventListener( 'click', ( event ) => {
		event.preventDefault()
		console.log( 'refresh clicked!' )
		fetch( '/reset' )
		downloadLink.classList.add( 'pure-button-disabled' )
		intervalID = setInterval( getUpdate, 5000 )
		clearForm()
	} )
	downloadLink.classList.add( 'pure-button-disabled' )
	logoutBtn = document.querySelector('#logoutButton')
	logoutBtn.addEventListener( 'click', async ( event ) => {
		event.preventDefault()
		fetch( '/logout' )
		window.location.href = '/'
	} )
}