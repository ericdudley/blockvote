import React, { Component, Fragment, ChangeEvent } from "react";
import {
  Icon,
  Button,
  Typography,
  TextField,
  CircularProgress
} from "@material-ui/core";
import {
  SortableContainer,
  SortableElement,
  arrayMove,
  SortableHandle
} from "react-sortable-hoc";
import cx from "classnames";
import "./styles.scss";
import { inject, observer } from "mobx-react";
import Store, { StoreProps } from "../store";
import { ElectionSelector, ErrorBar } from "../util";

const DragHandle = SortableHandle(() => (
  <Icon className="sortable__handle">menu</Icon>
));

const SortableItem = SortableElement(
  ({ value, rank }: any) =>
    (
      <li
        className={cx("sortable__item", {
          "sortable__item--disabled": rank > 3
        })}
      >
        <DragHandle />
        {value}
        <span className="sortable__rank">{rank}</span>
      </li>
    ) as any
);

const SortableList = SortableContainer(({ items }: any) => {
  return (
    <ul className="sortable">
      {items.map((value: number, index: number) => (
        <SortableItem
          key={`item-${index}`}
          index={index}
          rank={index + 1}
          value={value}
        />
      ))}
    </ul>
  );
});

@inject("store")
@observer
class VotePage extends Component<StoreProps> {
  onSortEnd = ({ oldIndex, newIndex }: any) => {
    const { sortedCandidates, onSortedCandidatesChange } = this.props
      .store as Store;
    onSortedCandidatesChange(arrayMove(sortedCandidates, oldIndex, newIndex));
  };

  onBallotKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onBallotKeyChange } = this.props.store as Store;
    onBallotKeyChange(event.target.value);
  };

  onBatchBallotKeysChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onBatchBallotKeysChange } = this.props.store as Store;
    onBatchBallotKeysChange(event.target.value);
  };

  render() {
    const {
      sortedCandidates,
      ballotIsValid,
      ballotKey,
      castBallot,
      castBatchBallot,
      batchBallotError,
      ballotError,
      batch_ballot_keys,
      batchBallotKeys,
      batchBallotIsValid
    } = this.props.store as Store;

    return (
      <div className="vote-page">
        <div className="vote-page__single">
          <Typography variant="caption" align="left">
            Rank the randomly ordered candidates by clicking and dragging your
            favorite candidates to the top of the list and least favorite to the
            bottom. Only your top 3 candidates will be counted.
          </Typography>
          <SortableList
            items={sortedCandidates}
            onSortEnd={this.onSortEnd}
            lockAxis="y"
            useDragHandle={false}
          />
          <TextField
            required
            label="Paste Ballot Key"
            placeholder="da8937ddve"
            margin="normal"
            variant="outlined"
            value={ballotKey}
            onChange={this.onBallotKeyChange}
            className="vote-page__single__ballot-key"
            helperText="48 characters"
          />
          {ballotError && (
            <ErrorBar message="Ballot was rejected by the node." />
          )}
          <Button
            color="primary"
            variant="outlined"
            disabled={!ballotIsValid}
            onClick={castBallot}
            className="vote-page__single__submit"
          >
            Cast Vote
            {/* <CircularProgress size={24} /> */}
          </Button>
        </div>
        <div className="vote-page__batch">
          <Typography variant="caption" align="left">
            Cast random ballots by pasting comma separated ballot keys below. A
            single random ballot will be casted for each valid ballot key.
          </Typography>
          <TextField
            required
            label="Paste Ballot Keys"
            placeholder="da8937ddve"
            margin="normal"
            variant="outlined"
            value={batchBallotKeys}
            onChange={this.onBatchBallotKeysChange}
            className="vote-page__batch__ballot-key"
          />
          {batchBallotError && (
            <ErrorBar message="Ballot was rejected by the node." />
          )}
          <Button
            color="primary"
            variant="outlined"
            disabled={!batchBallotIsValid}
            onClick={castBatchBallot}
            className="vote-page__batch__submit"
          >
            Cast {batch_ballot_keys.length} Votes
            {/* <CircularProgress size={24} /> */}
          </Button>
        </div>
      </div>
    );
  }
}

export default VotePage;
