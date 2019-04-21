import { observable, action, computed } from "mobx";
import { ChangeEvent } from "react";
import { shuffle } from "./helpers";
import axios, { AxiosPromise } from "axios";
import { number } from "prop-types";
import io from "socket.io-client";
import { electionRanking, Candidate, NewElectionResp } from "./blockchain";

export interface Node {
  port: number;
  nodes: number[];
  blockchain_count: number;
  status: boolean;
  is_miner: boolean;
  mining: number;
}

export interface NodeSocket {
  port: number;
  socket: SocketIOClient.Socket;
}

const API: string = "http://localhost:";
const BASE_PORT = 5000;
const NODE_SEARCH_COUNT = 8;
const SIGNING_KEY_LENGTH = 48;
export enum ELECTORAL_SYSTEM {
  INSTANT_RUNOFF = "Instant Runoff",
  BORDA_COUNT = "Borda Count"
}

const url = (port: number, path: string) => {
  return API + port.toString() + path;
};

class Store {
  @observable loading_nodes = false;
  @observable currentTab = 0;
  @observable sortedCandidates: Candidate[] = [];
  @observable ballotKey = "";
  @observable batchBallotKeys = "";
  @observable ballotError = false;
  @observable batchBallotError = false;
  @observable nodes: Node[] = [];
  @observable new_election_label = "Man of the Year";
  @observable new_election_candidates: string[] = [
    "Kanye West",
    "The Tallest Man On Earth",
    "Bruce Lee"
  ];
  @observable new_election_ballot_count = 20;
  @observable new_election_resp: NewElectionResp | null = null;
  @observable selected_node: number = 0;
  @observable selected_election: string = "";
  @observable selected_elections: any[] = [];
  @observable results_system: string = ELECTORAL_SYSTEM.BORDA_COUNT;

  private sockets: NodeSocket[] = [];

  @computed
  public get candidates(): string[] {
    if (!this.selected_election) {
      return [];
    } else {
      const election_obj = this.selected_elections.find(
        e => e["id"] === this.selected_election
      );
      if (election_obj) {
        return election_obj["chain"][0]["header"]["candidates"];
      } else {
        return [];
      }
    }
  }

  @computed
  public get graph() {
    const edges = [];
    for (const node of this.online_nodes) {
      for (const node2 of node.nodes) {
        edges.push({
          from: node.port,
          to: node2
        });
      }
    }
    return {
      edges,
      nodes: this.online_nodes.map(n => ({
        id: n.port,
        label: `${n.is_miner ? "Miner" : "Node"} ${n.port} [${
          n.blockchain_count
        }]`
      }))
    };
  }

  @computed
  public get online_nodes() {
    return this.nodes.filter(n => n.status);
  }

  @computed
  public get selected_election_obj() {
    const election_obj = this.selected_elections.find(
      e => e["id"] === this.selected_election
    );
    if (election_obj) {
      return election_obj;
    } else {
      return null;
    }
  }

  @computed
  public get batch_ballot_keys() {
    return this.batchBallotKeys ? this.batchBallotKeys.split(",") : [];
  }

  @computed
  public get selected_election_label() {
    const election_obj = this.selected_elections.find(
      e => e["id"] === this.selected_election
    );
    if (election_obj) {
      return election_obj["chain"][0]["header"]["label"];
    } else {
      return "";
    }
  }

  @computed
  public get new_election_keys() {
    return this.new_election_resp ? this.new_election_resp.signing_keys : null;
  }

  @action
  loadNodes = () => {
    this.loading_nodes = true;
    const promises: Promise<void>[] = [];
    for (let i = BASE_PORT; i < BASE_PORT + NODE_SEARCH_COUNT; i++) {
      const exists = this.nodes.map(n => n.port).includes(i);
      const socket_exists = this.sockets.map(n => n.port).includes(i);
      promises.push(
        axios
          .get(url(i, "/alive"))
          .then(() => {
            if (socket_exists) {
              const socket = this.sockets.find(n => n.port === i);
              if (socket) {
                socket.socket.close();
                this.sockets = this.sockets.filter(n => n.port === i);
              }
            }
            const new_socket = io(url(i, ""));
            new_socket.on("info", (body: any) => {
              const newNode = {
                port: i,
                nodes: body.nodes,
                blockchain_count: body.blockchain_count,
                status: true,
                is_miner: body.is_miner,
                mining: body.mining
              };
              const exists = this.nodes.map(n => n.port).includes(i);
              if (exists) {
                this.onNodesChange(
                  this.nodes.filter(n => n.port != i).concat(newNode)
                );
              } else {
                this.onNodesChange(this.nodes.concat(newNode));
              }
              this.onNodesChange(
                this.nodes.slice().sort((n1, n2) => n1.port - n2.port)
              );
            });
            this.sockets = this.sockets.concat({
              port: i,
              socket: new_socket
            });
          })
          .catch(err => {
            if (exists) {
              const node = this.nodes.find(n => n.port === i);
              if (node) {
                node.status = false;
                this.onNodesChange(
                  this.nodes.filter(n => n.port != i).concat(node)
                );
              }
            }
            if (socket_exists) {
              const socket = this.sockets.find(n => n.port === i);
              if (socket) {
                socket.socket.close();
                this.sockets = this.sockets.filter(n => n.port === i);
              }
            }
          })
      );
    }
    Promise.all(promises).finally(() => {
      setTimeout(() => {
        this.loading_nodes = false;
      }, 1000);
    });
  };

  @action
  loadResults = () => {
    axios.get(url(this.selected_node, "/elections")).then((resp: any) => {
      this.onSelectedElectionsChange(resp.data);
    });
  };

  @action
  newElection = () => {
    axios
      .post(url(this.selected_node, "/new_election"), {
        label: this.new_election_label,
        candidates: this.new_election_candidates,
        ballot_count: this.new_election_ballot_count
      })
      .then(resp => {
        this.new_election_resp = resp.data;
        this.loadResults();
      });
  };

  @action
  onCurrentTabChange = (_event: ChangeEvent<{}>, newTab: number) => {
    this.currentTab = newTab;
  };

  @action
  onSortedCandidatesChange = (newCandidates: Candidate[]) => {
    this.sortedCandidates = newCandidates;
  };

  @action
  onBallotKeyChange = (newBallotKey: string) =>
    (this.ballotKey = newBallotKey.replace(/(^")|("$)/g, ""));

  @action
  onBatchBallotKeysChange = (newBatchBallotKeys: string) =>
    (this.batchBallotKeys = newBatchBallotKeys.replace(/(^")|("$)/g, ""));

  @action
  castBallot = () => {
    const ballot = {
      election: this.selected_election,
      candidates: this.sortedCandidates,
      signing_key: this.ballotKey
    };

    axios
      .post(url(this.selected_node, "/cast_ballot"), ballot)
      .then(resp => {
        shuffle(this.sortedCandidates);
        this.ballotKey = "";
      })
      .then(resp => {
        this.ballotError = false;
      })
      .catch(err => {
        this.ballotError = true;
      });
  };

  @action
  castBatchBallot = () => {
    this.batch_ballot_keys.forEach((key, idx) => {
      setTimeout(() => {
        const ballot = {
          election: this.selected_election,
          candidates: shuffle(this.sortedCandidates.slice(0)),
          signing_key: key
        };

        axios
          .post(url(this.selected_node, "/cast_ballot"), ballot)
          .then(resp => {
            this.batchBallotKeys = "";
            this.batchBallotError = false;
          })
          .catch(err => {
            this.batchBallotError = true;
          });
      }, idx * 100);
    });
  };

  @action
  onNewElectionLabelChange = (value: string) => {
    this.new_election_label = value;
  };

  @action
  onNewElectionCandidatesChange = (value: string[]) => {
    this.new_election_candidates = value;
  };

  @action
  onNewElectionBallotCountChange = (value: number) => {
    this.new_election_ballot_count = value;
  };

  onSelectedNodeChange = (value: number) => {
    this.selected_node = value;
    this.loadResults();
  };

  onResultsSystemChange = (value: string) => {
    this.results_system = value;
  };

  onSelectedElectionChange = (value: string) => {
    this.selected_election = value;
    this.onSortedCandidatesChange(this.candidates);
  };

  onNodesChange = (nodes: Node[]) => {
    this.nodes = nodes;
    if (!this.selected_node && this.nodes.length > 0) {
      this.onSelectedNodeChange(this.nodes[0].port);
    }
  };

  onSelectedElectionsChange = (selected_elections: any[]) => {
    this.selected_elections = selected_elections;
    if (
      (!this.selected_election ||
        !this.selected_elections
          .map(e => e.id)
          .includes(this.selected_election)) &&
      this.selected_elections.length > 0
    ) {
      this.onSelectedElectionChange(this.selected_elections[0].id);
    }
  };

  @computed
  get ballotIsValid() {
    return this.ballotKey && this.ballotKey.length == SIGNING_KEY_LENGTH;
  }

  @computed
  get batchBallotIsValid() {
    return (
      this.batchBallotKeys &&
      this.batch_ballot_keys.length > 0 &&
      this.batch_ballot_keys.every(key => key.length === SIGNING_KEY_LENGTH)
    );
  }

  @computed
  get newElectionIsValid() {
    return (
      this.new_election_label.length &&
      this.new_election_candidates.length &&
      this.new_election_ballot_count &&
      this.selected_node
    );
  }

  @computed
  get election_ranking() {
    return electionRanking(this.selected_election_obj, this.results_system);
  }
}

export default Store;
export interface StoreProps {
  store?: Store;
}
