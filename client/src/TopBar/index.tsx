import React, { Component, ChangeEvent } from "react";
import { AppBar, Toolbar, Tabs, Tab, Typography } from "@material-ui/core";
import "./styles.scss";
import { inject, observer } from "mobx-react";
import Store, { StoreProps } from "../store";
import { Status, ElectionSelector, NodeSelector } from "../util";

@inject("store")
@observer
class TopBar extends Component<StoreProps> {
  state = {
    tab: 0
  };

  onSelectedElectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onSelectedElectionChange } = this.props.store as Store;
    onSelectedElectionChange(event.target.value);
  };

  render() {
    const {
      currentTab,
      onCurrentTabChange,
      online_nodes,
      selected_node,
      selected_elections,
      selected_election,
      onSelectedNodeChange
    } = this.props.store as Store;

    return (
      <AppBar className="appbar" position="static">
        <Toolbar>
          <div className="logo appbar__logo" />
          <Typography variant="h6" className="appbar__title">
            Block Vote
            <Typography variant="caption">
              {online_nodes.length} nodes online
              <Status status={online_nodes.length > 0} />
            </Typography>
          </Typography>
          <Tabs
            className="appbar__tabs"
            value={currentTab}
            onChange={onCurrentTabChange}
            variant="scrollable"
          >
            <Tab label="Nodes" />
            <Tab label="Election" />
            <Tab label="Vote" />
            <Tab label="Results" />
          </Tabs>
          <NodeSelector
            className="appbar__select"
            textClassName="appbar__select__text"
            value={selected_node}
            onChange={onSelectedNodeChange}
          />
          <ElectionSelector
            className="appbar__select"
            textClassName="appbar__select__text"
            elections={selected_elections}
            value={selected_election}
            onChange={this.onSelectedElectionChange}
          />
        </Toolbar>
      </AppBar>
    );
  }
}

export default TopBar;
