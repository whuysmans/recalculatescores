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
	let results = await( fetch( '/test2', {
		method: 'POST',
		body: obj
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