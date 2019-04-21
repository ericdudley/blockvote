import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import Store, { StoreProps } from "../store";
import {
  Typography,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Icon,
  Button
} from "@material-ui/core";
import Graph from "react-graph-vis";
import "./styles.scss";
import { Status } from "../util";

@inject("store")
@observer
export class NodePage extends Component<StoreProps> {
  private interv: any;

  render() {
    const { nodes, graph, loadNodes, loading_nodes } = this.props
      .store as Store;
    return (
      <div>
        {nodes.length === 0 && (
          <div className="node-page--empty">
            <Button
              disabled={loading_nodes}
              onClick={loadNodes}
              variant="outlined"
              color="primary"
            >
              Refresh Nodes
            </Button>
          </div>
        )}
        {nodes.length > 0 && (
          <div className="node-page">
            {/* <Typography variant="title">Block Vote Nodes</Typography> */}
            <div className="node-page__list">
              <div className="node-page__list__actions">
                <Button onClick={loadNodes} variant="outlined" color="primary">
                  Refresh Nodes
                </Button>
              </div>
              <div className="node-page__list__cards">
                {nodes.map((node, idx) => {
                  return (
                    <Card key={idx} className="node-page__list__cards__card">
                      <CardContent>
                        <div className="node-page__list__cards__card-status">
                          <Status status={node.status} />
                        </div>
                        <Typography variant="title">
                          {node.is_miner ? "Miner" : "Node"} {node.port}
                        </Typography>
                        <Typography variant="caption">Neighbors</Typography>
                        <Typography>{node.nodes.join(", ")}</Typography>
                        <Typography variant="caption">
                          {node.blockchain_count} Elections
                        </Typography>
                        {node.is_miner && node.mining && (
                          <Typography>Mining block {node.mining}.</Typography>
                        )}
                      </CardContent>
                      <CardActions />
                    </Card>
                  );
                })}
              </div>
            </div>
            <div className="node-page__graph">
              <Graph graph={graph} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default NodePage;
