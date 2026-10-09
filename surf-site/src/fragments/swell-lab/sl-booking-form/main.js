const form = fragmentElement.querySelector('.sl-booking__form');
const status = fragmentElement.querySelector('.sl-booking__status');

const product = new URLSearchParams(window.location.search).get('product');

if (product && form.elements.product.querySelector(`option[value="${product}"]`)) {
	form.elements.product.value = product;
}

function setStatus(message, type) {
	status.className = `sl-booking__status sl-booking__status--${type}`;
	status.textContent = message;
}

form.addEventListener('submit', async (event) => {
	event.preventDefault();

	if (!form.checkValidity()) {
		setStatus('Please fill in your name, email, and preferred date.', 'error');

		return;
	}

	const booking = Object.fromEntries(new FormData(form));

	try {
		const response = await fetch('/o/c/surfbookings', {
			body: JSON.stringify(booking),
			headers: {
				'Content-Type': 'application/json',
				'x-csrf-token': Liferay.authToken,
			},
			method: 'POST',
		});

		if (!response.ok) {
			throw new Error(`/o/c/surfbookings returned ${response.status}`);
		}

		if (window.Analytics) {
			window.Analytics.send('bookingRequested', 'SwellLab', {
				product: booking.product,
			});
		}

		form.reset();

		setStatus('Thanks! Your request is in. A coach will email you within one day.', 'success');
	}
	catch (error) {
		console.error(error);

		setStatus('We could not send your request. Please try again in a moment.', 'error');
	}
});
