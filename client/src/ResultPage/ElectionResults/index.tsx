import React, { Component, ChangeEvent } from "react";
import { inject, observer } from "mobx-react";
import Store, { StoreProps } from "../../store";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@material-ui/core";
import "./styles.scss";
import { Rank } from "../../blockchain";
import { ElectoralSystemSelector } from "../../util";

export interface ElectionResultsProps {
  election: any;
}

@inject("store")
@observer
export class ElectionResults extends Component<
  StoreProps & ElectionResultsProps
> {
  onResultsSystemChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { onResultsSystemChange } = this.props.store as Store;
    onResultsSystemChange(event.target.value);
  };

  render() {
    const { election } = this.props;
    const {
      selected_election_label,
      election_ranking,
      onResultsSystemChange,
      results_system
    } = this.props.store as Store;
    return (
      election && (
        <Card className="election-results">
          <CardHeader title={selected_election_label} />
          <CardContent>
            <ElectoralSystemSelector
              value={results_system}
              onChange={this.onResultsSystemChange}
              className="election-results__system"
            />
            <Typography variant="caption">Candidates</Typography>
            <span className="election-results__candidate">
              {election.chain[0].header.candidates.join(", ")}
            </span>
            <div className="election-results__table">
              <Typography variant="h6">Ranking</Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {election_ranking.map((rank: Rank, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{rank.name}</TableCell>
                      <TableCell>{rank.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )
    );
  }
}

export default ElectionResults;
