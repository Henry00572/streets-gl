import Material, {UniformType} from "../../../renderer/Material";
import Shaders from "../Shaders";
import Renderer from "../../../renderer/Renderer";
import Texture2DArray from "../../../renderer/Texture2DArray";
import GLConstants from "../../../renderer/GLConstants";

export default class GaussianBlurMaterial extends Material {
	constructor(renderer: Renderer) {
		super(renderer, {
			name: 'GaussianBlurMaterial',
			fragmentShader: Shaders.gaussianBlur.fragment,
			vertexShader: Shaders.gaussianBlur.vertex,
			uniforms: {
				direction: {type: UniformType.Float2, value: null},
				tColor: {type: UniformType.Texture2D, value: null}
			}
		});
	}
}