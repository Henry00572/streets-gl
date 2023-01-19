import MathUtils from "~/lib/math/MathUtils";
import TileGeometryBuilder from "../geometry/TileGeometryBuilder";
import HeightViewer from "../HeightViewer";
import {
	WorkerMessageIncoming,
	WorkerMessageIncomingType,
	WorkerMessageOutgoing,
	WorkerMessageOutgoingType
} from "./WorkerMessageTypes";
import Vec2 from "~/lib/math/Vec2";
import Config from "../../Config";
import CombinedUniversalFeatureProvider
	from "../universal-features/providers/CombinedUniversalFeatureProvider";
import GroundGeometryBuilder, {
	GroundGeometryData
} from "../universal-features/providers/GroundGeometryBuilder";
import Tile3DBuilder from "../tile3d/Tile3DBuilder";

const ctx: Worker = self as any;
const heightViewer = new HeightViewer();
heightViewer.requestHeightFunction = (x: number, y: number): void => {
	sendMessage({
		type: WorkerMessageIncomingType.RequestHeight,
		tile: [x, y]
	});
};

const provider = new CombinedUniversalFeatureProvider();
const tile3d = new Tile3DBuilder();

ctx.addEventListener('message', async event => {
	const data = event.data as WorkerMessageOutgoing;
	const x = data.tile[0];
	const y = data.tile[1];

	if (data.type === WorkerMessageOutgoingType.Start) {
		load(x, y);

		/*const ground = GroundGeometryBuilder.getGroundGeometry(x, y, heightViewer);

		const universalCollection = await provider.getCollection({x, y});
		const tile3dData = tile3d.fromUniversalFeatures({
			collection: universalCollection,
			heightViewer,
			groundData: ground
		});*/
	} else if (data.type === WorkerMessageOutgoingType.SendHeightData) {
		heightViewer.pushHeightTile(data.tile[0], data.tile[1], data.heightArray);
	}
});

function sendMessage(msg: WorkerMessageIncoming): void {
	ctx.postMessage(msg,
		msg.type === WorkerMessageIncomingType.Success ?
			[
				msg.result.buildings.position.buffer,
				msg.result.buildings.uv.buffer,
				msg.result.buildings.normal.buffer,
				msg.result.buildings.textureId.buffer,
				msg.result.buildings.color.buffer,
				msg.result.buildings.id.buffer,
				msg.result.buildings.offset.buffer,
				msg.result.buildings.localId.buffer,
				msg.result.ground.position.buffer,
				msg.result.ground.uv.buffer,
				msg.result.ground.normal.buffer,
				msg.result.ground.index.buffer,
				msg.result.roads.position.buffer,
				msg.result.roads.uv.buffer,
				msg.result.roads.normal.buffer,
				msg.result.roads.textureId.buffer
			] :
			[]
	);
}

function load(x: number, y: number): void {
	const offset = 0.05;
	const position = [
		MathUtils.tile2degrees(x - offset, y + 1 + offset),
		MathUtils.tile2degrees(x + 1 + offset, y - offset)
	];
	const bbox = position[0].lat + ',' + position[0].lon + ',' + position[1].lat + ',' + position[1].lon;

	const urls = [
		//'http://overpass.openstreetmap.ru/cgi/interpreter?data=',
		'https://overpass.kumi.systems/api/interpreter?data='
		//'https://overpass.nchc.org.tw/api/interpreter?data=',
		//'https://lz4.overpass-api.de/api/interpreter?data=',
		//'https://z.overpass-api.de/api/interpreter?data='
	];
	let url = urls[Math.floor(urls.length * Math.random())];
	url += `
		[out:json][timeout:${Math.floor(Config.OverpassRequestTimeout / 1000)}];
		(
			node(${bbox});
			way(${bbox});
			rel["type"="building"](${bbox});
		 	rel["type"="multipolygon"]["building"](${bbox});
		 	rel["type"="multipolygon"]["building:part"](${bbox});
		 	rel["type"="multipolygon"]["highway"](${bbox});
		)->.data;
		
		.data > ->.dataMembers;
		
		(
			.data;
			.dataMembers;
		)->.all;
		
		.all out body qt;
	`;

	url = `http://localhost:3000/tile?x=${x}&y=${y}`;

	const httpRequest = new XMLHttpRequest();

	httpRequest.onreadystatechange = function (): void {
		if (httpRequest.readyState === XMLHttpRequest.DONE) {
			if (httpRequest.status === 200) {
				buildGeometry(x, y, JSON.parse(httpRequest.responseText));
			} else {
				sendMessage({
					type: WorkerMessageIncomingType.Error,
					tile: [x, y],
					result: {errorCode: httpRequest.status}
				});
			}
		}
	};

	httpRequest.timeout = Config.OverpassRequestTimeout;
	httpRequest.open('GET', url);
	httpRequest.send();
}

async function buildGeometry(x: number, y: number, data: any): Promise<void> {
	const builder = new TileGeometryBuilder(x, y, heightViewer);
	const tilesList = builder.getCoveredTiles(data);

	const neighbors = [];

	for (let i = -1; i <= 2; i++) {
		for (let j = -1; j <= 2; j++) {
			neighbors.push(new Vec2(x + i, y + j));
		}
	}

	await heightViewer.requestTileSet(tilesList);
	await heightViewer.requestTileSet(neighbors);

	const result = await builder.getTileGeometry();

	sendMessage({
		type: WorkerMessageIncomingType.Success,
		tile: [x, y],
		result: result
	});
}

export default null as any;
