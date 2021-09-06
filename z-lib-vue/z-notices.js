'use strict';

/* 
App:     z-notices (Vue.js 2)
Ver:     1.1
Desc:    Simple notices for Vue.js 2.
Author:  https://pdz.me
*/

const notices = {
	lastId: 0,
	items: [],
	groups: {},
	add(data, params) {
		if(!data) return null;
		if(!params) params = {}
		if(typeof data == 'string') {
			params.html = data;
		}
		else if(data.render && data._compiled) {
			params.component = data;
		}
		else if(typeof data == 'object') {
			Object.assign(params, data);
		}
		if(!params.g) params.g = 'main';
		if(!(params.html || params.component) || !this.groups[params.g]) return null;
		if(this.lastId >= Number.MAX_SAFE_INTEGER) this.lastId = 0;
		const obj = {
			id: ++this.lastId,
			needClose: false,
			g: params.g,
			c: params.class || params.c || null,
			html: params.html || null,
			component: params.component || null,
			componentProps: params.componentProps || params.props || null,
			timeout: Number.isInteger(params.timeout) ? params.timeout : this.groups[params.g].timeout,
			repeat: typeof params.repeat == 'boolean' ? params.repeat : this.groups[params.g].repeat,
			reverse: typeof params.reverse == 'boolean' ? params.reverse : this.groups[params.g].reverse,
			closer: typeof params.closer == 'boolean' ? params.closer : this.groups[params.g].closer,
			closerSwipe: typeof params.closerSwipe == 'boolean' ? params.closerSwipe : this.groups[params.g].closerSwipe,
			isText: typeof params.isText == 'boolean' ? params.isText : this.groups[params.g].isText,
			on: typeof params.on == 'object' && Object.isExtensible(params.on) ? params.on : {}
		}
		if(obj.closerSwipe === null) obj.closerSwipe = obj.closer;
		if(!obj.repeat) {
			const ex = this.items.find(el => el.g === obj.g && el.html === obj.html && el.c === obj.c);
			if(ex) ex.needClose = true;
		}
		if(obj.reverse) this.items.unshift(obj);
		else this.items.push(obj);
		return obj.id;
	},
	del(id) {
		this.items = this.items.filter(el => el.id !== id);
	},
	clear() {
		this.items = [];
	}
}

const comp = {
	add: notices.add.bind(notices),
	del: notices.del.bind(notices),
	clear: notices.clear.bind(notices),
	install(Vue, opt) {
		opt = Object.assign({
			name: 'z-notices',
			glob: 'n',
		}, opt || {});
		Vue.prototype['$' + opt.glob] = {
			add: notices.add.bind(notices),
			del: notices.del.bind(notices),
			clear: notices.clear.bind(notices),
		}
		const compos = {}
		compos[opt.name + '-item'] = {
			data() {
				return {
					touchStartPos: 0,
					touchEndDelta: 0,
					active: true,
					timer: null,
					t: 0,
					w: 100,
					step: 200
				}
			},
			props: {
				component: {
				},
				componentProps: {
					type: Object,
					default: null
				},
				html: {},
				needClose: {
					type: Boolean,
					default: false
				},
				on: {
					type: Object,
					default: {}
				},
				isText: {
					type: Boolean,
					default: false
				},
				id: {
					type: Number
				},
				c: {
					type: String,
					default: null
				},
				timeout: {
					type: Number
				},
				closer: {
					type: Boolean,
					default: true
				},
				closerSwipe: {
					type: Boolean,
					default: null
				},
				closerHTML: {
					type: String
				}
			},
			watch: {
				needClose() {
					this.del();
				}
			},
			methods: {
				del() {
					this.active = false;
					if(this.timer) clearInterval(this.timer);
					if(this.on && typeof this.on.closed == 'function') this.on.closed(this.id);
					this.$emit('closed', this.id);
				},
				reset() {
					if(!this.timeout || !this.active) return;
					if(this.timer) clearInterval(this.timer);
					this.t = this.timeout;
					this.w = 100;
				},
				resume() {
					if(!this.timeout || !this.active) return;
					this.reset();
					this.timer = setInterval(() => {
						this.t -= this.step;
						this.w = ((100 / this.timeout) * this.t);
						if(this.t < 0) {
							this.del();
						}
					}, this.step);
				}
			},
			mounted() {
				if(this.timeout) this.resume();
			},
			render(h) {
				return h('div', {
					class: this.c ? [opt.name + '-item', this.c] : opt.name + '-item',
					on: Object.assign({}, 
						this.timeout ? {
							mouseenter: this.reset,
							mouseleave: this.resume
						} : {},
						this.closerSwipe ? {
							touchstart: (e) => {
								this.touchStartPos = e.changedTouches[0].clientX;
								this.touchEndDelta = 0;
								if(this.timeout) this.reset();
							},
							touchend: (e) => {
								if(this.touchStartPos == e.changedTouches[0].clientX) {
									return;
								}
								if(Math.abs(this.touchEndDelta) > 100) {
									this.del();
								} else {
									this.$el.style.opacity = '';
									this.$el.style.left = '';
									if(this.timeout) this.resume();
								}
							},
							touchcancel: () => {
								this.$el.style.left = '';
								this.$el.style.opacity = '';
								if(this.timeout) this.resume();
							},
							touchmove: (e) => {
								e.preventDefault();
								this.touchEndDelta = e.changedTouches[0].clientX - this.touchStartPos;
								const moveTo = Math.min(100, Math.max(-100, this.touchEndDelta));
								this.$el.style.opacity = 1 - Math.abs(moveTo * 0.01);
								this.$el.style.left = moveTo + 'px';
							}
						} : {}
					)
				}, [
					this.component
					? h('div', {
						class: opt.name + '-content'
					}, [
						h(this.component, {
							props: this.componentProps || {},
							on: Object.assign({}, this.on || {}, {
								close: (e) => {
									this.del(e);
									if(this.on.close) this.on.close(e);
								}
							})
						})
					])
					: h('div', {
						class: opt.name + '-content',
						domProps: this.isText ? {
							innerText: this.html
						} : {
							innerHTML: this.html
						}
					}),
					this.closer ? h('div', {
						class: opt.name + '-closer',
						on: {
							click: this.del
						},
						domProps: {
							innerHTML: this.closerHTML
						}
					}) : null,
					this.timeout ? h('div', {class: opt.name + '-timer'}, [
						h('div', {
							class: opt.name + '-timer-line',
							style: {
								transition: 'width ' + this.step + 'ms linear',
								width: this.w + '%'
							}
						})
					]) : null,
				]);
			}
		}
		Vue.component(opt.name, {
			components: compos,
			data() {
				return {
					notices
				}
			},
			props: {
				g: {
					type: String,
					default: 'main'
				},
				timeout: {
					type: Number,
					default: 5000
				},
				reverse: {
					type: Boolean,
					default: false
				},
				repeat: {
					type: Boolean,
					default: false
				},
				closer: {
					type: Boolean,
					default: true
				},
				closerSwipe: {
					type: Boolean,
					default: null
				},
				isText: {
					type: Boolean,
					default: false
				},
				closerHTML: {
					type: String,
					default: '<svg viewBox="0 0 386.667 386.667" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="m386.667 45.564-45.564-45.564-147.77 147.769-147.769-147.769-45.564 45.564 147.769 147.769-147.769 147.77 45.564 45.564 147.769-147.769 147.769 147.769 45.564-45.564-147.768-147.77z"/></svg>'
				}
			},
			computed: {
				itms() {
					return this.notices.items.slice().filter(el => el.g == this.g);
				}
			},
			methods: {
				del(id) {
					this.notices.del(id);
				}
			},
			created() {
				this.notices.groups[this.g] = Object.assign(this.notices.groups[this.g] || {}, {
					timeout: this.timeout,
					repeat: this.repeat,
					closer: this.closer,
					closerSwipe: this.closerSwipe,
					reverse: this.reverse,
					isText: this.isText
				});
			},
			render(h) {
				return h('transition-group', {
					class: opt.name,
					props: {
						tag: 'div',
						name: opt.name
					}
				}, this.itms.map(el => {
					return h(opt.name + '-item', {
						props: Object.assign({
							closerHTML: this.closerHTML
						}, el),
						key: el.id,
						on: {
							closed: this.del
						}
					});
				}));
			}
		});
	}
}

export default comp;
