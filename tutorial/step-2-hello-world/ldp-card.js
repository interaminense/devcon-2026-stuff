class LdpCard extends HTMLElement {
	connectedCallback() {
		this.innerHTML = '<p>Hello, World!</p>';
	}
}

customElements.define('ldp-card', LdpCard);
