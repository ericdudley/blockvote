import React, { Component, Fragment } from "react";
import TopBar from "./TopBar";
import Content from "./Content";
import { observer, inject } from "mobx-react";
import Store, { StoreProps } from "./store";

@inject("store")
@observer
class App extends Component<StoreProps> {
  componentDidMount() {
    const { loadNodes } = this.props.store as Store;
    loadNodes();
  }

  render() {
    return (
      <div id="app">
        <TopBar />
        <Content />
      </div>
    );
  }
}

export default App;
