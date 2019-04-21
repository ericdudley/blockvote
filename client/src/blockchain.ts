import { string, number } from "prop-types";
import { ELECTORAL_SYSTEM } from "./store";
import ElectionPage from "./ElectionPage";

export interface Rank {
  name: string;
  value: number;
}

export interface NewElectionResp {
  id: string;
  label: string;
  time: number;
  candidates: string[];
  verifying_keys: string[];
  signing_keys: string[];
}

export interface Blockchain {
  id: string;
  label: string;
  chain: Block[];
}

export interface Block {
  header: BlockHeader;
  ballots: BallotMsg[];
}

export interface BlockHeader {
  election: string;
  id: string;
  timestamp: number;
  nonce: number;
  previous_hash: string;
  previous_id: string;
  mined_by: number;
}

export interface BallotMsg {
  ballot: Ballot;
  signature: string;
}

export interface Ballot {
  id: string;
  election: string;
  candidates: Candidate[];
  verifying_key: string;
}

export type Candidate = string;
type Candidates = Candidate[];
type Counts = { [key: string]: number };

// export interface Candidate {
//   name: string;
// }

export type Ranking = Rank[];

export const electionRanking = (
  election: Blockchain,
  system: ELECTORAL_SYSTEM | string
): Ranking => {
  if (election) {
    if (system === ELECTORAL_SYSTEM.BORDA_COUNT) {
      const counts: any = {};
      election.chain.forEach(block => {
        block.ballots.forEach(ballot => {
          const candidates = ballot.ballot.candidates.slice(0);
          for (let i = 0; i < candidates.length; i++) {
            if (!counts[candidates[i]]) {
              counts[candidates[i]] = 0;
            }
            counts[candidates[i]] += 5 * (candidates.length - i);
          }
        });
      });

      return Object.keys(counts)
        .map(key => ({
          name: key,
          value: counts[key]
        }))
        .sort((rank1, rank2) => rank2.value - rank1.value);
    } else if (system === ELECTORAL_SYSTEM.INSTANT_RUNOFF) {
      let ballots: Candidates[] = [];
      election.chain.forEach(block => {
        block.ballots.forEach(ballot => {
          const new_candidates: Candidates = [];
          ballot.ballot.candidates.forEach(candidate => {
            new_candidates.push(candidate);
          });
          if (new_candidates.length > 0) {
            ballots.push(new_candidates);
          }
        });
      });
      while (ballots.length > 0 && !getMajority(ballots)) {
        const worst = getMin(ballots);
        ballots = ballots
          .map(candidates =>
            candidates[0] == worst ? candidates.slice(1) : candidates
          )
          .filter(candidates => candidates.length > 0);
      }
      const final_counts = getCounts(ballots);
      return Object.entries(final_counts)
        .map(([candidate, count]) => ({
          name: candidate,
          value: count
        }))
        .sort((rank1, rank2) => rank2.value - rank1.value);
    }
  }
  return [];
};

const getCounts = (ballots: Candidates[]): Counts => {
  const counts: Counts = {};

  ballots.forEach(candidates => {
    const candidate = candidates[0];
    if (!counts[candidate]) {
      counts[candidate] = 0;
    }
    counts[candidate] += 1;
  });

  return counts;
};

const getMajority = (ballots: Candidates[]): Candidate | null => {
  const counts = getCounts(ballots);
  const total: number = Object.entries(counts).reduce(
    (sum, [_, count]) => sum + count,
    0
  );
  const max = Object.entries(counts).reduce(
    (max, [candidate, count]) => (count > counts[max] ? candidate : max),
    Object.keys(counts)[0]
  );
  return counts[max] > total / 2 ? max : null;
};

const getMin = (ballots: Candidates[]): Candidate => {
  const counts = getCounts(ballots);
  return Object.entries(counts).reduce(
    (min, [candidate, count]) => (count < counts[min] ? candidate : min),
    Object.keys(counts)[0]
  );
};
