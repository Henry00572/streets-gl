import Handler from "~/lib/tile-processing/tile3d/handlers/Handler";
import Tile3DFeature from "~/lib/tile-processing/tile3d/features/Tile3DFeature";
import VectorArea, {VectorAreaRing, VectorAreaRingType} from "~/lib/tile-processing/vector/features/VectorArea";
import OSMReference from "~/lib/tile-processing/vector/features/OSMReference";
import {VectorAreaDescriptor} from "~/lib/tile-processing/vector/descriptors";
import Tile3DExtrudedGeometryBuilder, {
	RingType,
	RoofType
} from "~/lib/tile-processing/tile3d/builders/Tile3DExtrudedGeometryBuilder";
import Vec2 from "~/lib/math/Vec2";
import Tile3DExtrudedGeometry from "~/lib/tile-processing/tile3d/features/Tile3DExtrudedGeometry";

export default class VectorAreaHandler implements Handler {
	private readonly osmReference: OSMReference;
	private readonly descriptor: VectorAreaDescriptor;
	private readonly rings: VectorAreaRing[];

	public constructor(feature: VectorArea) {
		this.osmReference = feature.osmReference;
		this.descriptor = feature.descriptor;
		this.rings = feature.rings;
	}

	public getFeatures(): Tile3DFeature[] {
		if (this.descriptor.type === 'building' || this.descriptor.type === 'buildingPart') {
			return [this.handleBuilding()];
		} else if (this.descriptor.type === 'water') {
			//return [this.handleWater()];
		}

		return [];
	}

	private handleBuilding(): Tile3DExtrudedGeometry {
		const builder = new Tile3DExtrudedGeometryBuilder(this.osmReference);

		for (const ring of this.rings) {
			const type = ring.type === VectorAreaRingType.Inner ? RingType.Inner : RingType.Outer;
			const nodes = ring.nodes.map(node => new Vec2(node.x, node.y));

			builder.addRing(type, nodes);
		}

		builder.setSmoothingThreshold(20);
		builder.addWalls({
			minHeight: this.descriptor.buildingMinHeight,
			height: this.descriptor.buildingHeight,
			color: this.descriptor.buildingFacadeColor,
			textureId: 0
		});
		builder.addRoof({
			type: this.getRingTypeFromString(this.descriptor.buildingRoofType),
			minHeight: this.descriptor.buildingMinHeight + this.descriptor.buildingHeight,
			height: this.descriptor.buildingRoofHeight,
			textureId: 0,
			color: ~~(Math.random() * 0xffffff)
		});

		return builder.getGeometry();
	}

	private handleWater(): Tile3DExtrudedGeometry {
		return null;
	}

	private getRingTypeFromString(str: VectorAreaDescriptor['buildingRoofType']): RoofType {
		switch (str) {
			case 'flat': return RoofType.Flat;
			case 'gabled': return RoofType.Gabled;
			case 'hipped': return RoofType.Hipped;
			case 'pyramidal': return RoofType.Pyramidal;
			case 'skillion': return RoofType.Skillion;
		}

		console.error(`Roof type ${str} is not supported`);

		return RoofType.Flat;
	}
}