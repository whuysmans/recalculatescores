let progress = 0
let statusElement = null

const getResults = async () => {
	const form = document.querySelector( '#resultForm' )
	const formData = new FormData( form )
	console.log( formData )
	let results = await( fetch( '/test', formData ) )
}

const getUpdate = async () => {
	let update = await( fetch( '/update' ) )
	statusElement.innerHTML = update
}

window.onload = () => {
	const btn = document.querySelector( '#resultSubmit' )
	statusElement = document.querySelector( '#status' )
	btn.prevenDefault()
	btn.addEventListener( 'click', getResults  )
}