const signedIn = themeDisplay.isSignedIn();

fragmentElement.querySelectorAll('.sl-header__signed-in').forEach((element) => {
	element.hidden = !signedIn;
});

fragmentElement.querySelectorAll('.sl-header__signed-out').forEach((element) => {
	element.hidden = signedIn;
});

const signIn = fragmentElement.querySelector('.sl-header__signed-out');

if (signIn && !signedIn && !location.pathname.includes('sign-in')) {
	signIn.href = '/c/portal/login?redirect=' + encodeURIComponent(location.pathname + location.search);
}
