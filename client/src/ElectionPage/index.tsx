import React, { Component, ChangeEvent } from "react";
import { inject, observer } from "mobx-react";
import { Button, TextField, Select, Input, MenuItem } from "@material-ui/core";
import Store, { StoreProps } from "../store";
import "./styles.scss";
import { NodeSelector, Json } from "../util";
import copy from "copy-to-clipboard";

@inject("store")
@observer
export class ElectionPage extends Component<StoreProps> {
  onNewElectionLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onNewElectionLabelChange } = this.props.store as Store;
    onNewElectionLabelChange(event.target.value);
  };

  onNewElectionBallotCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onNewElectionBallotCountChange } = this.props.store as Store;
    const val: number = parseInt(event.target.value);
    onNewElectionBallotCountChange(val === NaN ? 0 : val);
  };

  onNewElectionCandidatesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onNewElectionCandidatesChange } = this.props.store as Store;
    onNewElectionCandidatesChange(
      event.target.value.split(",").map(c => c.trim())
    );
  };

  onCopyKeys = () => {
    const { new_election_keys } = this.props.store as Store;
    if (new_election_keys) {
      const str = new_election_keys
        .slice(new_election_keys.length > 4 ? 4 : 0)
        .join(",");
      copy(str);
    }
  };

  render() {
    const {
      new_election_label,
      new_election_candidates,
      new_election_ballot_count,
      new_election_resp,
      newElection,
      newElectionIsValid,
      new_election_keys
    } = this.props.store as Store;
    return (
      <div className="election-page__new-form">
        <TextField
          label="Election Label"
          value={new_election_label}
          onChange={this.onNewElectionLabelChange}
          className="election-page__new-form__input"
        />
        <TextField
          label="Candidates"
          value={new_election_candidates}
          onChange={this.onNewElectionCandidatesChange}
          className="election-page__new-form__input"
        />
        <TextField
          label="Ballot Count"
          value={new_election_ballot_count}
          onChange={this.onNewElectionBallotCountChange}
          className="election-page__new-form__input"
          type="number"
        />
        <Button
          color="primary"
          variant="outlined"
          className="election-page__new-form__input"
          onClick={newElection}
          disabled={!newElectionIsValid}
        >
          Create Election
        </Button>
        <div className="election-page__response">
          {new_election_keys && (
            <Button
              color="primary"
              variant="outlined"
              onClick={this.onCopyKeys}
            >
              Copy{" "}
              {new_election_keys.length > 4
                ? new_election_keys.length - 4
                : new_election_keys.length}{" "}
              Signing Keys
            </Button>
          )}
          {new_election_resp && (
            <Json name="New Election" obj={new_election_resp} />
          )}
        </div>
      </div>
    );
  }
}

export default ElectionPage;
