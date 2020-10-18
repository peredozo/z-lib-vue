<template>
	<div id="app">
			<div><a href="https://github.com/peredozo/z-lib-vue">Get sources from GitHub</a></div><hr/>

		<!-- z-notices -->
			<h1>z-notices demo</h1>
			<main>
				<a href="#" @click.prevent="testNotice">Notice</a> / <a href="#" @click.prevent="testNoticeRepeat">Unique notice</a> / <a href="#" @click.prevent="testNoticeCompo">Vue component notice</a> / <a href="#" @click.prevent="testAlert">Test alert</a>
			</main>
			<z-notices class="alert" g="alert" :timeout="0" :reverse="true"/>
		<!-- /z-notices -->

			<hr/>

		<!-- z-dialogs -->
			<h1>z-dialogs demo</h1>
			<main>
				<a href="#" @click.prevent="testDialog">Dialog</a> / <a href="#" @click.prevent="testDialogCompo">Vue component dialog</a>
			</main>
		<!-- /z-dialogs -->

			<hr/>

		<!-- z-ws -->
			<h1>z-ws demo</h1>
			<main>
				<h2>exmo.me rates:</h2>
				<div v-for="(r, pair) in ws2data" :key="'ws2-' + pair" @click.prevent="copy(pair + ': ' + r.buy_price)">
					<b>{{pair}}</b> - {{r.buy_price}}
				</div>
				<h2>blockchain.info UTX:</h2>
				<div v-for="(b, i) in ws1data" :key="'ws1-' + i" @click.prevent="copy('TX: ' + b.hash)">
					TX: <b>{{b.hash}}</b> - {{b.val}} BTC
				</div>
			</main>
		<!-- /z-ws -->

			<hr/>

		<!-- z-dialogs -->
			<z-dialogs/>
		<!-- /z-dialogs -->

		<!-- z-notices -->
			<z-notices class="default" :repeat="false" :reverse="false" :closer="true"/>
		<!-- /z-notices -->

	</div>
</template>

<script>

import test from './test.vue';

export default {
	data() {
		return {
			// z-ws
			ws1data: [],
			ws2data: {}
			// /z-ws
		}
	},
	methods: {
		// z-copy
		copy(msg) {
			this.$copy(msg, () => {
				this.$n.add('Copied to clipboard: <b>' + msg + '</b>', {
					reverse: true,
					c: 'success'
				});
			});
		},
		// /z-copy
		// z-dialogs
		testDialog() {
			this.$d.add('Dialog', {
				closerOutside: false
			});
		},
		testDialogCompo() {
			this.$d.add(test, {
				componentProps: {
					test: 'dialog'
				}
			});
		},
		// /z-dialogs
		// z-notices
		testNoticeCompo() {
			this.$n.add(test, {
				reverse: true,
				repeat: true,
				componentProps: {
					test: 'notice'
				},
			});
		},
		testNotice() {
			const c = ['success', 'error', 'warn', 'info'];
			const id = Math.random() > 0.5 ? this.$n.add('Current timestamp: ' + Date.now()) : this.$n.add({
				html: 'Current <b>timestamp</b>: ' + Date.now(), // html content
				c: c[Math.round(Math.random() * (c.length - 1))], // additional class
				timeout: (Math.round(Math.random() * 20) + 1) * 1000, // timeout ms
				closer: Math.random() > 0.5 ? true : false, // close button
				reverse: Math.random() > 0.5 ? true : false, // insert to top
				repeat: Math.random() > 0.5 ? true : false, // don't remove another notices with same html and class
				on: {
					closed(id) {
						console.log('Closed notice:', id);
					}
				}
			});
			console.log('Open notice:', id);
		},
		testNoticeRepeat() {
			const c = ['success', 'error', 'warn', 'info'];
			this.$n.add({
				html: 'I close another notices with same html and class.',
				c: c[Math.round(Math.random() * (c.length - 1))],
			});
		},
		testAlert() {
			const c = ['success', 'error', 'warn', 'info'];
			this.$n.add({
				g: 'alert',
				html: 'Send notice to another group (g="alert") and without automating close (:timeout="0").',
				c: c[Math.round(Math.random() * (c.length - 1))],
			});
		},
		// /z-notices
	},
	created() {
		// z-ws
		const wsconf = {
			parser: JSON.parse, // function to parse income messages before .on('message')
			formater: JSON.stringify, // function to format outgoing messages by .send(message) before sending to WebSocket
			reconnect(connect, retry) { // reconnect(connect_function, retry_counter, ev) / called by WebSocket.onclose(ev) only if ev.code != 4999
				setTimeout(() => {
					connect();
				}, parseInt((retry - 1) * 5 * Math.random()) * 1000);
			}
		}
		// this.$ws.glob.ws1 = // for global access by any component
		const ws1 = this.$ws.create('wss://ws.blockchain.info/inv', wsconf)
		.on('open', () => {
			console.log('Opened WS: blockchain.info');
			ws1.send({op: 'unconfirmed_sub'});
		})
		.on('message', (m) => {
			if(m.op == 'utx' && m.x) {
				let val = 0;
				m.x.out.forEach(el => {
					val += el.value;
				});
				this.ws1data.unshift({
					hash: m.x.hash,
					val: parseFloat(val / Math.pow(10, 8)).toFixed(8)
				});
				this.ws1data = this.ws1data.slice(0, 20);
			}
		})
		.on('error', (e) => {
			console.error(e);
		})
		.connect();
		// ws1.close(code=4999); // for close connection

		// and another ws provider
		const ws2 = this.$ws.create('wss://ws-api.exmo.me/v1/public', wsconf)
		.on('open', () => {
			console.log('Opened WS: exmo.me');
			ws2.send({
				id: 1,
				method: 'subscribe',
				topics: [
					'spot/ticker:BTC_USD',
					'spot/ticker:ETH_USD',
					'spot/ticker:LTC_USD',
					'spot/ticker:XMR_USD',
				]
			});
		})
		.on('message', (m) => {
			if(m.event == 'update' && m.topic && m.data) {
				const pair = m.topic.split(':').reverse()[0].replace('_', '-');
				this.ws2data[pair] = m.data;
				console.log('New ' + pair + ' retes from exmo.me');
			}
		})
		.on('error', (e) => {
			console.error(e);
		})
		.connect();
		// /z-ws
	}
}
</script>

<style>
html, body { width: 100%; height: 100%; }
body { font-size: 14px; line-height: 20px; font-family: monospace; margin: 0; padding: 20px; box-sizing: border-box; }

/* default template */
.z-notices.default { position: fixed; top: 0; right: 0; max-width: 400px; width: 100%; padding: 0px 10px; box-sizing: border-box; }
.z-notices.default .z-notices-item { position: relative; background-color: #111; color: #FFF; padding: 20px; margin-top: 10px; border-radius: 3px; }
.z-notices .z-notices-content { line-height: inherit; }
.z-notices .z-notices-closer { position: absolute; top: 0; right: 0; padding: 5px; cursor: pointer; color: #FFF; opacity: 0.5; }
.z-notices .z-notices-closer>svg { display: block; width: 10px; height: 10px; }
.z-notices .z-notices-closer:hover { opacity: 1; }
.z-notices .z-notices-timer { position: absolute; bottom: 0; left: 0; width: 100%; height: 10px; padding: 3px; box-sizing: border-box; }
.z-notices .z-notices-timer-line { position: relative; height: 100%; background-color: #FFF; opacity: 0.35; transition: width 0.5s linear; border-radius: 3px; }
.z-notices .z-notices-enter-active, 
.z-notices .z-notices-leave-active { transition: all 0.2s linear; }
.z-notices .z-notices-enter, 
.z-notices .z-notices-leave-to { padding-top: 0 !important; padding-bottom: 0 !important; line-height: 0 !important; margin-top: 0 !important; opacity: 0 !important; transform: scale(0.5); }
.z-notices .z-notices-item.success { background-color: #090 !important; }
.z-notices .z-notices-item.error { background-color: #900 !important; }
.z-notices .z-notices-item.warn { background-color: #D60 !important; }
.z-notices .z-notices-item.info { background-color: #06D !important; }

/* alerts template */
.z-notices.alert { width: 100%; overflow: auto; box-sizing: border-box; }
.z-notices.alert .z-notices-item { position: relative; background-color: #111; color: #FFF; padding: 20px; }

.z-notices a { color: #FFF; }


/* dialogs */

.z-dialogs-body-have-dialogs { overflow: hidden; }

.z-dialogs { position: relative; }

.z-dialogs .z-dialogs-item { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
.z-dialogs .z-dialogs-item::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); box-sizing: border-box; }
.z-dialogs .z-dialogs-wrap { position: relative; min-width: 100%; padding: 10px; box-sizing: border-box; overflow: auto; }
.z-dialogs .z-dialogs-dialog { position: relative; margin: auto; background-color: #FFF; color: #111; padding: 20px; max-width: 400px; width: 100%; box-sizing: border-box; border-radius: 3px; }

.z-dialogs .z-dialogs-closer { position: absolute; top: 0; right: 0; padding: 5px; cursor: pointer; color: #111; opacity: 0.5; }
.z-dialogs .z-dialogs-closer>svg { display: block; width: 10px; height: 10px; }
.z-dialogs .z-dialogs-closer:hover { opacity: 1; }

.z-dialogs .z-dialogs-enter-active, 
.z-dialogs .z-dialogs-leave-active { transition: all 0.2s linear; }
.z-dialogs .z-dialogs-enter, 
.z-dialogs .z-dialogs-leave-to { opacity: 0; }

.z-dialogs .z-dialogs-enter-active .z-dialogs-dialog, 
.z-dialogs .z-dialogs-leave-active .z-dialogs-dialog { transition: all 0.2s linear; }
.z-dialogs .z-dialogs-enter .z-dialogs-dialog, 
.z-dialogs .z-dialogs-leave-to .z-dialogs-dialog { opacity: 0; transform: scale(0.5); }

.z-dialogs .z-dialogs-item.fullpage .z-dialogs-wrap { flex: 1; }
.z-dialogs .z-dialogs-item.fullpage .z-dialogs-dialog { max-width: none; width: 100%; min-height: 100%; }

</style>
