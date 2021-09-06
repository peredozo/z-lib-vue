'use strict';

/* 
App:     z-notices (Vue.js 3)
Ver:     1.0
Desc:    Simple notices for Vue.js 3.
Author:  https://pdz.me
*/

import { h, reactive, TransitionGroup, markRaw } from 'vue';

const nGroups = reactive({});

const nList = reactive([]);

let nLastId = 0;

const nNextId = () => {
	if(nLastId >= Number.MAX_SAFE_INTEGER) nLastId = 0;
	return ++nLastId;
}

const nClear = () => {
	nList.splice(0, nList.length);
}

const nDel = (id) => {
	const findId = nList.findIndex(el => el.id == id);
	if(findId >= 0) {
		if(typeof nList[findId].onClosed == 'function') nList[findId].onClosed(nList[findId].id);
		nList.splice(findId, 1);
	}
}

const nAdd = (data, params) => {
	if(!data) return null;
	if(!params) params = {}
	if(typeof data == 'string') {
		params.html = data;
	}
	else if(data !== null && typeof data == 'object') {
		if(typeof data.render == 'function') {
			params.component = data;
		} else {
			Object.assign(params, data);
		}
	}
	else return null;
	if(!params.g) params.g = 'main';
	if(!(params.html || params.component) || !nGroups[params.g]) return null;
	const obj = {
		id: nNextId(),
		g: params.g,
		class: params.class || null,
		html: params.html || null,
		component: params.component ? markRaw(params.component) : null,
		componentProps: params.props || null,
		timeout: Number.isInteger(params.timeout) ? params.timeout : nGroups[params.g].timeout,
		repeat: typeof params.repeat == 'boolean' ? params.repeat : nGroups[params.g].repeat,
		reverse: typeof params.reverse == 'boolean' ? params.reverse : nGroups[params.g].reverse,
		closer: typeof params.closer == 'boolean' ? params.closer : nGroups[params.g].closer,
		closerSwipe: typeof params.closerSwipe == 'boolean' ? params.closerSwipe : nGroups[params.g].closerSwipe,
		closerHTML: typeof params.closerHTML == 'string' ? params.closerHTML : nGroups[params.g].closerHTML,
		isText: typeof params.isText == 'boolean' ? params.isText : nGroups[params.g].isText,
		onClosed: params.onClosed || null
	}
	if(obj.closerSwipe === null) obj.closerSwipe = obj.closer;
	if(!obj.repeat) {
		const ex = nList.find(el => el.g === obj.g && el.html === obj.html && el.class === obj.class && !el.deleted);
		if(ex) nDel(ex.id);
	}
	if(obj.reverse) nList.unshift(obj);
	else nList.push(obj);
	return obj.id;
}

export default {
	VUE3: {
		install(Vue, opt) {
			opt = Object.assign({
				name: 'z-notices',
				glob: 'n',
			}, opt || {});
			Vue.config.globalProperties['$' + opt.glob] = {
				add: nAdd,
				del: nDel,
				clear: nClear,
			}

			const NoticeItem = {
				emits: ['closed'],
				data: () => ({
					deleted: false,
					touchStartPos: 0,
					touchEndDelta: 0,
					active: true,
					timer: null,
					t: 0,
					w: 100,
					step: 200
				}),
				props: {
					notice: {
						type: Object
					}
				},
				beforeUnmount() {
					this.clear();
				},
				methods: {
					clear() {
						this.active = false;
						if(this.timer) clearInterval(this.timer);
					},
					del() {
						if(this.deleted) return;
						this.deleted = true;
						this.clear();
						this.$emit('closed', this.notice.id);
					},
					reset() {
						if(!this.notice.timeout || !this.active) return;
						if(this.timer) clearInterval(this.timer);
						this.t = this.notice.timeout;
						this.w = 100;
					},
					resume() {
						if(!this.notice.timeout || !this.active) return;
						this.reset();
						this.timer = setInterval(() => {
							this.t -= this.step;
							this.w = ((100 / this.notice.timeout) * this.t);
							if(this.t < 0) {
								this.del();
							}
						}, this.step);
					}
				},
				mounted() {
					if(this.notice.timeout) this.resume();
				},
				render() {
					return h('div', Object.assign(
						{
							class: [opt.name + '-item', this.notice.class || null],
						}, 
						this.notice.timeout ? {
							onmouseenter: this.reset,
							onmouseleave: this.resume
						} : {},
						this.notice.closerSwipe ? {
							ontouchstart: (e) => {
								this.touchStartPos = e.changedTouches[0].clientX;
								this.touchEndDelta = 0;
								if(this.notice.timeout) this.reset();
							},
							ontouchend: (e) => {
								if(this.touchStartPos == e.changedTouches[0].clientX) {
									return;
								}
								if(Math.abs(this.touchEndDelta) > 100) {
									this.del();
								} else {
									this.$el.style.opacity = '';
									this.$el.style.left = '';
									if(this.notice.timeout) this.resume();
								}
							},
							ontouchcancel: () => {
								this.$el.style.left = '';
								this.$el.style.opacity = '';
								if(this.notice.timeout) this.resume();
							},
							ontouchmove: (e) => {
								e.preventDefault();
								this.touchEndDelta = e.changedTouches[0].clientX - this.touchStartPos;
								const moveTo = Math.min(100, Math.max(-100, this.touchEndDelta));
								this.$el.style.opacity = 1 - Math.abs(moveTo * 0.01);
								this.$el.style.left = moveTo + 'px';
							}
						} : {}
					), [
						this.notice.component ? h('div', {
							class: opt.name + '-content'
						}, [
							h(this.notice.component, Object.assign({
								onClose: () => this.del()
							}, this.notice.componentProps || {}))
						]) : h('div', Object.assign({
							class: opt.name + '-content'
						}, this.notice.isText ? {
							innerText: this.notice.html
						} : {
							innerHTML: this.notice.html
						})),
						this.notice.closer ? h('div', {
							class: opt.name + '-closer',
							onclick: this.del,
							innerHTML: this.notice.closerHTML
						}) : null,
						this.notice.timeout ? h('div', {class: opt.name + '-timer'}, [
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

			const Notices = {
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
					isText: {
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
					closerHTML: {
						type: String,
						default: '<svg viewBox="0 0 386.667 386.667" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="m386.667 45.564-45.564-45.564-147.77 147.769-147.769-147.769-45.564 45.564 147.769 147.769-147.769 147.77 45.564 45.564 147.769-147.769 147.769 147.769 45.564-45.564-147.768-147.77z"/></svg>'
					}
				},
				computed: {
					items() {
						return nList.slice().filter(el => el.g == this.g);
					}
				},
				created() {
					nGroups[this.g] = Object.assign(nGroups[this.g] || {}, {
						timeout: this.timeout,
						repeat: this.repeat,
						reverse: this.reverse,
						isText: this.isText,
						closer: this.closer,
						closerSwipe: this.closerSwipe,
						closerHTML: this.closerHTML,
					});
				},
				render() {
					return h(TransitionGroup, {
						class: opt.name,
						tag: 'div',
						name: opt.name
					}, () => this.items.map(el => {
						return h(NoticeItem, {
							notice: el,
							key: el.id,
							onClosed: () => nDel(el.id)
						});
					}));
				}
			}
			Vue.component(opt.name, Notices);
		}
	}
}
