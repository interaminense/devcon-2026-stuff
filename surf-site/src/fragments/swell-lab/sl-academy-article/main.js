// Renders the article named by ?id= from the contents embedded in the
// fragment: the same title, image, and text as its Surf Academy block

const articles = JSON.parse(fragmentElement.querySelector('[data-articles]').textContent);
const body = fragmentElement.querySelector('[data-article-body]');
const article = articles[new URLSearchParams(window.location.search).get('id')];

const escape = (text) => {
	const element = document.createElement('span');

	element.textContent = text;

	return element.innerHTML;
};

if (!article) {
	body.innerHTML = '<div class="sl-article__content"><h1>Article not found</h1><p>This guide is not available. <a href="/learn">See all the Surf Academy guides</a>.</p></div>';
}
else {
	body.innerHTML = `
		<img alt="" class="sl-article__image" src="${article.image}" />
		<div class="sl-article__content">
			<span class="sl-tag">${escape(article.tag)}</span>
			<h1>${escape(article.title)}</h1>
			<p class="sl-article__lead">${escape(article.lead)}</p>
			${article.body.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}
			<a class="sl-article__cta" href="${article.href}">Keep learning in the water &rarr;</a>
		</div>
	`;

	if (layoutMode === 'view') {
		document.title = `${article.title} - Swell Lab`;
	}
}
