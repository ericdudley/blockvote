import React, { Component, ChangeEvent } from "react";
import { List, ListItem, ListItemText, Typography } from "@material-ui/core";
import "./styles.scss";
import { NodeSelector, ElectionSelector } from "../util";
import Store, { StoreProps } from "../store";
import { observer, inject } from "mobx-react";
import Chain from "./Chain";
import ElectionResults from "./ElectionResults";

@inject("store")
@observer
class ResultPage extends Component<StoreProps> {
  pollInterval: number = 0;

  componentDidMount() {
    const { loadResults } = this.props.store as Store;
    loadResults();
    this.pollInterval = setInterval(loadResults, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.pollInterval);
  }

  render() {
    const {
      selected_node,
      selected_elections,
      selected_election,
      selected_election_obj
    } = this.props.store as Store;
    return (
      <div>
        <ElectionResults election={selected_election_obj} />
        {selected_election_obj && <Chain chain={selected_election_obj.chain} />}
      </div>
    );
  }
}

export default ResultPage;
