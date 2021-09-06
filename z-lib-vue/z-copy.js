'use strict';

/* 
App:     z-copy
Ver:     1.1
Desc:    Simple copy to clipboard.
Author:  https://pdz.me
*/

const copy = {
	_copy_v1(data, onCopied, onError) {
		return new Promise((pres, prej) => {
			try {
				navigator.clipboard.writeText(data).then(() => {
					pres(true);
					if(typeof onCopied === 'function') onCopied(true);
				}).catch(() => {
					copy._copy_v2(data, onCopied, onError).then(pres).catch(prej);
				});
			} catch(e) {
				copy._copy_v2(data, onCopied, onError).then(pres).catch(prej);
			}
		});
	},
	_copy_v2(data, onCopied, onError) {
		return new Promise((pres, prej) => {
			window.getSelection().removeAllRanges();
			const cel = document.createElement('div');
			cel.style.position = 'fixed';
			cel.style.opacity = 0;
			cel.innerHTML = data;
			document.body.appendChild(cel);
			try {
				const range = document.createRange();
				range.selectNode(cel);
				window.getSelection().addRange(range);
				const ok = document.execCommand('copy');
				pres(ok);
				if(typeof onCopied === 'function') onCopied(ok);
			} catch(e) {
				prej(e);
				if(typeof onError === 'function') onError(e);
			}
			window.getSelection().removeAllRanges();
			document.body.removeChild(cel);
		});
	},
	copy(data, onCopied, onError) {
		if(!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return copy._copy_v2(data, onCopied, onError);
		else return copy._copy_v1(data, onCopied, onError);
	},
	install(Vue, opt) { // DEPRECATED
		this.VUE.install(Vue, opt);
	},
	VUE: {
		install(Vue, opt) {
			opt = Object.assign({
				glob: 'copy'
			}, opt || {});
			Vue.prototype['$' + opt.glob] = copy.copy;
		}
	}
}

export default copy;
