import { NextRequest, NextResponse } from "next/server";
import {
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
} from "@solana/actions";

const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

export async function GET(req: NextRequest) {
  let response: ActionGetResponse = {
    type: "action",
    icon: `https://res.cloudinary.com/dqutstz1q/image/upload/v1729265344/yea6zyzy4a3xevguiajs.png`,
    title: "Check ASR Rewards",
    description: "Check Jupiter ASR for OCT 2024",
    label: "Check ASR",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Check ASR",
          href: "/api/asr",
        },
      ],
    },
  };

  return NextResponse.json(response, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { account: string };

    const sender = new PublicKey(body.account);

    const jupResponse = await fetch(
      `https://worker.jup.ag/asr-claim-proof/${sender}?asrTimeline=oct-2024&mints=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN%2CCLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu`
    );
    const jupData = await jupResponse.json();

    let jupRewards = 0;
    let cloudClaim = 0;
    let voteStatus = 0;

    if (
      jupData.claim[0].mint === "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu"
    ) {
      jupRewards = jupData.claim[1].amount / 1_000_000;
      cloudClaim = jupData.claim[0].amount / 1_000_000_000;
      voteStatus = jupData.voteCount;
    } else {
      jupRewards = jupData.claim[0].amount / 1_000_000;
      cloudClaim = jupData.claim[1].amount / 1_000_000_000;
      voteStatus = jupData.voteCount;
    }

    console.log(jupRewards, cloudClaim, voteStatus);

    const cloudinaryImageUrl = `https://res.cloudinary.com/dqutstz1q/image/upload/l_text:Arial_60_bold:JUP%20Balance%20${jupRewards},g_north,x_20,y_30/l_text:Arial_60_bold:CLOUD%20${cloudClaim},g_south,x_20,y_30/yea6zyzy4a3xevguiajs.png`;

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: new PublicKey("CRtPaRBqT274CaE5X4tFgjccx5XXY5zKYfLPnvitKdJx"),
        lamports: LAMPORTS_PER_SOL * 0,
      })
    );
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = sender;

    return NextResponse.json(
      await createPostResponse({
        fields: {
          type: "transaction",
          links: {
            next: {
              type: "inline",
              action: {
                description: `You have received ${jupRewards} JUP and ${cloudClaim} CLOUD for voting ${voteStatus} times out of 4 Votes`,
                icon: cloudinaryImageUrl,
                label: `ASR Rewards`,
                title: `ASR Rewards`,
                type: "completed",
              },
            },
          },
          transaction: tx,
          message: `Action completed`,
        },
      }),
      {
        headers: ACTIONS_CORS_HEADERS,
      }
    );
  } catch (err) {
    console.log("Error in POST /api/action", err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
}
