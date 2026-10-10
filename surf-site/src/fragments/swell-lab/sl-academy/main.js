// "Read more" goes nowhere: it only sends the surfContentClicked custom event
// to LDP, with the block's id, its current title, and its position on the page

fragmentElement.querySelectorAll('[data-content-id]').forEach((item, index) => {
	item.addEventListener('click', (event) => {
		if (!event.target.closest('.sl-academy__more')) {
			return;
		}

		window.Analytics?.track('surfContentClicked', {
			contentId: item.dataset.contentId,
			contentTitle: item.querySelector('[data-content-title]')?.textContent.trim(),
			position: index + 1,
		});
	});
});
