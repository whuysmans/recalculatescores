let downloadLink = null
let refreshLink = null
let btn = null
let logoutBtn = null

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
	downloadLink.classList.remove( 'pure-button-disabled' )
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
	btn.addEventListener( 'click', ( event ) => {
		console.log( 'clicked!' )
		btn.classList.add( 'pure-button-disabled' )
		getResults( event )
	} )
	refreshLink.addEventListener( 'click', ( event ) => {
		event.preventDefault()
		console.log( 'refresh clicked!' )
		fetch( '/reset' )
		downloadLink.classList.add( 'pure-button-disabled' )
		clearForm()
	} )
	downloadLink.classList.add( 'pure-button-disabled' )
	logoutBtn = document.querySelector('#logoutButton')
	logoutBtn.addEventListener( 'click', async ( event ) => {
		event.preventDefault()
		fetch( '/logout' )
		window.open( '/' )
	} )
}