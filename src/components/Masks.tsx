import * as React from "react";
import {
  DEFAULT_IMAEGS,
  createSnapShotUVMap,
  SNAP_SHOT_UV_MAP
} from "../util/consts";
import { ApiDelegate } from "../util/ApiDelegate";

export interface Mask {
  path: string;
  name: string;
  uvMap: number[][];
  image: HTMLImageElement;
}

const createMask = (path: string, name: string, uvMap: number[][]): Mask => {
  const img = document.createElement("img");
  img.src = path;
  return {
    path,
    name,
    image: img,
    uvMap
  };
};

const createMaskFromTemplate = async (fileName: string) =>
  new Promise<Mask>(res => {
    const img = document.createElement("img");
    const path = ApiDelegate.api.getImageSrc(fileName);
    img.src = path;
    img.onload = () => {
      res({
        path,
        name: fileName,
        image: img,
        uvMap: createSnapShotUVMap(SNAP_SHOT_UV_MAP, img.height)
      });
    };
  });

const createMaskFromUv = (fileName: string) =>
  new Promise<Mask>(async res => {
    const { uv } = await ApiDelegate.api.requestGet<{ uv: number[][] }>(
      `/uv?name=${fileName.replace(".png", "")}`
    );
    const img = document.createElement("img");
    const path = ApiDelegate.api.getImageSrc(fileName);
    img.src = path;
    img.onload = () => {
      res({
        path,
        name: fileName,
        image: img,
        uvMap: uv
      });
    };
  });

export const DEFAULT_MASKS: Mask[] = DEFAULT_IMAEGS.map(
  ({ path, uvMap, name }) => createMask(path, name, uvMap)
);

export class MaskSelector extends React.Component<
  {
    onChange: (mask: Mask) => void;
    selectedMask: Mask;
  },
  {
    masks: Mask[];
    selectedMask: Mask;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      masks: [...DEFAULT_MASKS],
      selectedMask: this.props.selectedMask
    };
  }

  async componentWillMount() {
    const { files: uvList } = await ApiDelegate.api.requestGet<{
      files: string[];
    }>("/uv-list");
    const { files } = await ApiDelegate.api.requestGet<{ files: string[] }>(
      "/images"
    );
    const hasUvFiles = files.filter(file => {
      const name = file.split(".png")[0];
      return uvList.find(uvName => uvName.indexOf(name) > -1);
    });
    const notHasUvFiles = files.filter(file => hasUvFiles.indexOf(file) < 0);
    const masks = await Promise.all([
      ...hasUvFiles.map(file => createMaskFromUv(file)),
      ...notHasUvFiles.map(file => createMaskFromTemplate(file))
    ]);
    const selectedMaskName = localStorage.getItem("last-saved-mask-name");
    const selectedMask = masks.find(mask => mask.name === selectedMaskName);
    this.setState({
      masks: [...masks, ...DEFAULT_MASKS],
      selectedMask: selectedMask || this.state.selectedMask
    });
    this.props.onChange(this.state.selectedMask);
  }

  render() {
    return (
      <div>
        <select
          onChange={e => {
            const mask = this.findMask(e.target.value);
            this.props.onChange(mask);
          }}
        >
          {this.state.masks.map(mask => {
            return (
              <option
                value={mask.path}
                key={mask.path}
                selected={mask.path === this.state.selectedMask.path}
              >
                {mask.name}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  private readonly findMask = (path: string) => {
    return this.state.masks.find(mask => mask.path === path);
  };
}
