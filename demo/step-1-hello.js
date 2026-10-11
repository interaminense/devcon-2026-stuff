class LdpDemoCard extends HTMLElement {
	connectedCallback() {
		this.innerHTML = '<p>Hello, DEVCON 2026!</p>';
	}
}

customElements.define('ldp-demo-card', LdpDemoCard);
