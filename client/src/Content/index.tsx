import React, { Component, Fragment } from "react";
import VotePage from "../VotePage";
import { inject, observer } from "mobx-react";
import Store from "../store";
import ResultPage from "../ResultPage";
import "./styles.scss";
import NodePage from "../NodePage";
import ElectionPage from "../ElectionPage";

interface ContentProps {
  store?: Store;
}

@inject("store")
@observer
class Content extends Component<ContentProps> {
  render() {
    const { currentTab } = this.props.store as Store;
    return (
      <div className="content">
        {currentTab === 0 && <NodePage />}
        {currentTab === 1 && <ElectionPage />}
        {currentTab === 2 && <VotePage />}
        {currentTab === 3 && <ResultPage />}
      </div>
    );
  }
}

export default Content;
