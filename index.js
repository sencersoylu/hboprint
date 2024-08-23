const exporter = require('highcharts-export-server');

var express = require('express');

var app = express();

app.use(express.json({ limit: '150mb' }));

app.use(
	express.urlencoded({ limit: '150mb', extended: true, parameterLimit: 100000 })
);

app.use(express.json());

const moment = require('moment');
const data = [];
let i = 0;

app.post('/', async function (request, response) {
	//console.log(request.body); // your JSON
	const data = await run(request.body);

	response.contentType('image/jpeg');
	response.send(Buffer.from(data, 'base64'));
});

async function run(arr) {
	return new Promise(async (resolve, reject) => {
		const obj = arr;

		const pressure = obj.pressure.map((p) => [
			moment(p.TIME).toDate(),
			Number(p.PRESSURE),
		]);

		let bands = obj.log.reduce((acc, log, i, arr) => {
			if (log.TYPE === 'SESSION_AUTO_TREATMENT_O2') {
				acc.push({
					from: moment(log.TIME).toDate().getTime(),
					to: moment(arr[i + 1].TIME)
						.toDate()
						.getTime(),
					color: '#b5e48c',
				});
			}
			return acc;
		}, []);

		const exportSettings = {
			export: {
				type: 'png',
				width: 1400,
				height: 600,
				options: {
					chart: {
						type: 'line',
					},
					title: {
						text: '',
					},
					legend: { enabled: false },

					xAxis: {
						crosshair: false,
						type: 'datetime',
						plotBands: bands,
					},
					yAxis: {
						title: {
							text: 'Pressure (fsw)',
						},
					},
					series: [
						{
							type: 'line',
							data: pressure.map(([x, y]) => [x.getTime(), y]),
						},
					],
				},
			},
		};
		const options = exporter.setOptions(exportSettings);
		await exporter.initPool(options);

		let data = exporter.startExport(exportSettings, function (res, err) {
			if (err) {
				console.error('Error in exporting chart:', err);
				reject(err);
			}
			//console.log(res.data);
			resolve(res.data);
		});
	});
}

app.listen(3000);
