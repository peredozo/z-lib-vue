'use strict';

/* 
App:     z-ws
Ver:     1.1
Desc:    Simple WebSocket client for browsers with sending buffer, customizable autoreconnect, messages parser and formater.
Author:  https://pdz.me
*/

const ws_glob = {}

class ws {

	constructor (url, conf) {
		if(!conf && typeof url == 'object') {
			conf = url;
			url = conf.url || (document.location.origin + '/');
		}
		if(!/^(http|ws)s?:\/\//.test(url)) url = new URL(url, document.baseURI).href;
		url = url.replace(/^http/, 'ws');
		this.c = null;
		this.emits = {}
		this.retry = 0;
		this.buf = [];
		this.closed = false;
		this.conf = Object.assign({
			reconnect: null, // onclose(ev) + reconnect(connect_function, retry_counter, ev)
			parser: null, // onmessage(message) > onmessage(parser(message.data))
			formater: null, // send(message) > send(formater(message))
			url,
		}, conf || {});
	}

	_emit(t, d) {
		if(this.emits[t] && this.emits[t].length) {
			this.emits[t].forEach(el => el.call(this, d));
		}
	}

	on(t, f) {
		this.emits[t] = this.emits[t] || [];
		this.emits[t].push(f);
		return this;
	}

	off(t, f) {
		if(!this.emits[t]) return this;
		this.emits[t] = this.emits[t].filter(el => el !== f);
		return this;
	}

	close(code) {
		this.closed = true;
		this.c.close(code || 1000);
		this.c = null;
		return this;
	}

	connect() {
		if(this.c) this.close();
		this.c = new WebSocket(this.conf.url);
		this.c.onopen = () => {
			this.closed = false;
			this.retry = 0;
			if(this.buf.length) {
				this.buf.forEach(el => this.c.send(el));
			}
			this.buf = [];
			this._emit('open');
		}
		this.c.onclose = (ev) => {
			this._emit('close', ev);
			if(this.closed) return;
			if(typeof this.conf.reconnect == 'function') {
				this.conf.reconnect(this.connect.bind(this), ++this.retry, ev);
			}
		}
		this.c.onerror = (e) => {
			this._emit('error', e);
		}
		this.c.onmessage = (m) => {
			if(typeof this.conf.parser == 'function') {
				try {
					m = this.conf.parser(m.data);
				} catch(e) {
					this._emit('error', e);
					return;
				}
			}
			this._emit('message', m);
		}
		return this;
	}

	send(data) {
		if(typeof this.conf.formater == 'function') {
			try {
				data = this.conf.formater(data);
			} catch(e) {
				this._emit('error', e);
				return this;
			}
		}
		if(this.c.readyState == WebSocket.OPEN) this.c.send(data);
		else this.buf.push(data);
		return this;
	}

	static get glob() {
		return ws_glob;
	}

	static create(url, conf) {
		return new ws(url, conf);
	}

	static get VUE() {
		return {
			install(Vue, opt) {
				opt = Object.assign({
					glob: 'ws'
				}, opt || {});
				Vue.prototype['$' + opt.glob] = ws;
			}
		}
	}

	static install(Vue, opt) { // DEPRECATED
		opt = Object.assign({
			glob: 'ws'
		}, opt || {});
		Vue.prototype['$' + opt.glob] = ws;
	}

}

export default ws;
