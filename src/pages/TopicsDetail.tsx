import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  Box,
  Heading,
  Text,
  TextInput,
  FormField,
  Button,
  Form,
} from "grommet";
import { LinkPrevious } from "grommet-icons";
import { DataStore, Auth } from "aws-amplify";

import { Proposal, Vote } from "../models";
import { useTopicByID } from "../hooks/topicHooks";
import { ProposalView } from "../components/ProposalView";
import TopicStatus from "../components/TopicStatus";
import { AnchorLink } from "../components/AnchorLink";

function TopicDetails() {
  const { id } = useParams();

  const [proposals, setProposals] = useState([]);

  const initialProposalFormState = {
    title: "",
    description: "",
    topicID: id,
    userID: "",
  };

  const [proposalFormState, setProposalFormState] = useState(
    initialProposalFormState
  );

  useEffect(() => {
    getUser();
    listProposals(setProposals);

    const subscription = DataStore.observe(Proposal, (p) =>
      p.topicID("eq", id)
    ).subscribe((msg) => {
      listProposals(setProposals);
    });

    return () => subscription.unsubscribe();
  }, [id]);

  async function listProposals(setProposals) {
    const proposals = await DataStore.query(Proposal, (p) =>
      p.topicID("eq", id)
    );
    if (proposals) {
      let proposalsWithVotes = [];
      for (let i = 0; i < proposals.length; i++) {
        const proposal = proposals[i];
        const votes = await DataStore.query(Vote, (v) =>
          v.proposalID("eq", proposal.id)
        );
        proposalsWithVotes[i] = { ...proposal, votes };
      }

      const sortedProposals = proposalsWithVotes.sort((a, b) => {
        return a.votes?.length < b.votes?.length ? 1 : -1;
      });
      setProposals(sortedProposals);
    }
  }

  async function getUser() {
    const user = await Auth.currentUserInfo();
    setInput("userID", user.id);
  }

  function setInput(key: string, value: string) {
    setProposalFormState({ ...proposalFormState, [key]: value });
  }

  async function submitProposalForm(setProposals) {
    try {
      if (
        !proposalFormState.title ||
        !proposalFormState.description ||
        !proposalFormState.topicID ||
        !proposalFormState.userID
      ) {
        console.warn("incomplete", proposalFormState);
        return;
      }
      const user = await Auth.currentUserInfo();
      await DataStore.save(new Proposal(proposalFormState));
      listProposals(setProposals);
      setProposalFormState({
        ...proposalFormState,
        title: "",
        description: "",
      });
    } catch (err) {
      console.log("error creating todo:", err);
    }
  }

  const topic = useTopicByID(id);

  return (
    <Box
      width="large"
      pad="medium"
      margin={{ vertical: "large", horizontal: "auto" }}
    >
      <AnchorLink to="/topics" label="Back" icon={<LinkPrevious />} />
      <Heading level="2" as="h1" margin={{ bottom: "small" }}>
        {topic.title}
      </Heading>
      <TopicStatus {...topic} />
      <Box margin={{ vertical: "medium" }}>
        <Text size="xlarge">{topic.description}</Text>
      </Box>

      {proposals.map((proposal: Proposal) => (
        <ProposalView key={proposal.id} {...proposal} />
      ))}

      <Box pad="medium" border="all" margin={{ vertical: "large" }}>
        <Heading level="4" as="h2" size="large" margin="none">
          Propose an option
        </Heading>
        <Form onSubmit={() => submitProposalForm(setProposals)}>
          <FormField label="Title">
            <TextInput
              required
              onChange={(event) => setInput("title", event.target.value)}
              value={proposalFormState.title}
              placeholder="What option should be added?"
            />
          </FormField>
          <FormField label="Description">
            <TextInput
              required
              onChange={(event) => setInput("description", event.target.value)}
              value={proposalFormState.description}
              placeholder="Why should this proposal be considered"
            />
          </FormField>
          <Button type="submit" label="Add Proposal" primary />
        </Form>
      </Box>
    </Box>
  );
}

export default TopicDetails;
