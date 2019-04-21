import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import "./styles.scss";
import { Json } from "../../util";

export interface ChainProps {
  chain: any[];
}

@inject("store")
@observer
export class Chain extends Component<ChainProps> {
  render() {
    const { chain } = this.props;
    return (
      <div className="chain">
        {chain.map((b, idx) => (
          <div key={idx} className="chain__block">
            <Json name={idx == 0 ? "Genesis Block" : `Block ${idx}`} obj={b} />
          </div>
        ))}
      </div>
    );
  }
}

export default Chain;
