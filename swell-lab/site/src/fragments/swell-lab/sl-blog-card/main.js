// "Read the post" sends the surfBlogPostClicked custom event to LDP before the
// post opens. The post id is the external reference code that DXP prints on
// the mapped title.

if (layoutMode === 'view') {
	fragmentElement.querySelector('.sl-card__link')?.addEventListener('click', () => {
		const title = fragmentElement.querySelector('[data-analytics-external-reference-code]');

		window.Analytics?.track('surfBlogPostClicked', {
			postId: title?.dataset.analyticsExternalReferenceCode,
			postTitle: fragmentElement.querySelector('.sl-card__title')?.textContent.trim(),
		});
	});
}
