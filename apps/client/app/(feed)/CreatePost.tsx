"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Compressor from "compressorjs";
import { MAX_CAPTION_LENGTH } from "db";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MdAddCircleOutline } from "react-icons/md";
import {
  useAccount,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";

import { DialogContent } from "@/components/Dialog";
import { PostTopBar } from "@/components/PostTopBar";
import { SubmitButton } from "@/components/SubmitButton";
import { SHARES_ABI } from "@/lib/abi/shares";
import { env } from "@/lib/env.mjs";

import { useAuth } from "../AuthProvider";
import { editPending } from "./editPending";
import { getPublishedId } from "./getPublishedId";

export function CreatePost() {
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [waitingForIndex, setWaitingForIndex] = useState(false);

  const { address } = useAccount();
  const { user, status } = useAuth();
  const { openConnectModal } = useConnectModal();
  const router = useRouter();

  const {
    config,
    isError: isErrorPrepare,
    error: errorPrepare,
    isLoading: isLoadingPrepare,
  } = usePrepareContractWrite({
    abi: SHARES_ABI,
    account: address,
    address: env.NEXT_PUBLIC_SHARES_ADDRESS as `0x${string}`,
    args: [url],
    enabled: Boolean(address),
    functionName: "createShare",
  });

  const {
    write,
    isLoading: isLoadingWrite,
    data,
    error: errorWrite,
  } = useContractWrite(config);

  const { isSuccess: isTxMined, isLoading: isWaitingOnTx } =
    useWaitForTransaction({
      hash: data?.hash,
    });

  const [isRedirecting, startRedirectTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();

  const isError = Boolean(errorPrepare || errorWrite);

  const imageDisabled =
    status !== "authenticated" ||
    isLoadingWrite ||
    isUploading ||
    isRedirecting ||
    isWaitingOnTx ||
    waitingForIndex;

  const captionDisabled =
    isLoadingWrite || isRedirecting || isWaitingOnTx || waitingForIndex;

  const submitDisabled =
    isLoadingPrepare ||
    isLoadingWrite ||
    isUploading ||
    isRedirecting ||
    isWaitingOnTx ||
    waitingForIndex ||
    !write ||
    status !== "authenticated" ||
    isErrorPrepare;

  useEffect(() => {
    if (!isTxMined) return;
    console.log("Transaction mined");

    setWaitingForIndex(true);

    let tries = 0;

    const interval = setInterval(async () => {
      tries++;

      try {
        const publicId = await getPublishedId();

        if (publicId) {
          clearInterval(interval);

          startRedirectTransition(() => {
            setOpen(false);
            setWaitingForIndex(false);
            router.push(`/post/${publicId}`);
          });

          return;
        }
      } catch (e) {
        console.error(e);
      }

      if (tries > 20) {
        startRedirectTransition(() => {
          console.error("Failed to get shareId");
          clearInterval(interval);
          setOpen(false);
          setWaitingForIndex(false);
          router.push("/");
        });
      }
    }, 2000);
  }, [isTxMined, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitDisabled) return;

    // Send transaction
    write();

    // Set description
    try {
      await editPending({
        caption: captionRef.current?.value ?? "",
      });
    } catch (e) {
      console.error(e);
    }
  }

  function promptFile(e: React.MouseEvent<unknown>) {
    e.preventDefault();

    // Connect wallet if not connected
    if (!address) {
      if (openConnectModal) {
        openConnectModal();
        return;
      }
    }

    if (imageDisabled) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.type.startsWith("image/gif")) {
        new Compressor(file, {
          error(err) {
            console.log(err.message);
          },
          maxWidth: 480,
          quality: 0.6,
          success: function (compressedFile) {
            setFile(
              new File([compressedFile], "compressed.gif", {
                type: "image/gif",
              }),
            );
          },
        });
      } else {
        // its an image. need to draw on canvas to remove exif data
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) return;
              setFile(new File([blob], file.name, { type: file.type }));
            },
            file.type,
            1,
          );
        };
      }

      setUrl("");
      setOpen(true);

      startUploadTransition(async () => {
        // Create db post
        const createdRes = await fetch("/api/pending", {
          method: "POST",
        });

        if (!createdRes.ok) {
          console.error("Failed to create pending");
          return;
        }

        const created = (await createdRes.json()) as {
          url: string;
          uploadUrl: string;
        };

        console.log("Created pending");
        setUrl(created.url);

        // Upload image
        const blob = new Blob([file], { type: file.type });

        const res = await fetch(created.uploadUrl, {
          body: blob,
          headers: {
            "Content-Type": file.type,
            "x-amz-acl": "public-read",
          },
          method: "PUT",
        });

        if (!res.ok) {
          console.error("Failed to upload image");
          return;
        }

        console.log("Uploaded image to", created.url);
      });
    };

    input.click();
  }

  if (!user || status !== "authenticated") return null;

  const closeDisabled =
    isUploading ||
    isLoadingWrite ||
    isRedirecting ||
    isWaitingOnTx ||
    waitingForIndex;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (open && closeDisabled) {
          return;
        }

        setOpen(o);
      }}
    >
      <Dialog.Trigger onClick={promptFile} asChild>
        <button
          draggable={false}
          className="flex h-full w-full select-none flex-col items-center justify-center rounded-xl p-3 text-slate-400 transition active:scale-95 active:text-white md:flex-row md:justify-start md:rounded-full md:bg-white md:py-2.5 md:text-black md:active:text-black"
        >
          <span className="pb-0.5 text-2xl md:hidden md:w-9">
            <MdAddCircleOutline />
          </span>
          <span className="text-sm font-bold md:flex md:w-full md:justify-center md:text-xl">
            Upload
          </span>
        </button>
      </Dialog.Trigger>

      <DialogContent title="Create Post" disabled={closeDisabled}>
        <form onSubmit={submit} className="space-y-2">
          <PostTopBar owner={user} disableLink />

          {file ? (
            <img
              src={URL.createObjectURL(file)}
              onClick={promptFile}
              className={`max-h-[400px] w-full rounded-lg object-contain transition md:max-h-[600px] ${
                imageDisabled
                  ? "opacity-50"
                  : "hover:cursor-pointer hover:opacity-80"
              }`}
              alt="Upload preview"
            />
          ) : (
            <div className="h-64 w-full rounded-lg bg-slate-700" />
          )}

          <textarea
            ref={captionRef}
            disabled={captionDisabled}
            maxLength={MAX_CAPTION_LENGTH}
            placeholder="Add a caption..."
            rows={2}
            className={`w-full rounded-lg bg-slate-900 px-3 py-1 placeholder:text-slate-400 ${
              captionDisabled ? "opacity-50" : ""
            }`}
          />

          <div className="flex justify-center">
            <SubmitButton type="submit" disabled={submitDisabled}>
              Post
            </SubmitButton>
          </div>
        </form>

        {isError ? (
          <p className="pt-4 text-center text-sm text-red-500">
            Error creating post.
          </p>
        ) : isWaitingOnTx ? (
          <p className="pt-4 text-center text-sm text-slate-500">
            Waiting for transaction to be mined...
          </p>
        ) : isTxMined ? (
          <p className="pt-4 text-center text-sm text-sky-400">
            Success! Waiting for indexer...
          </p>
        ) : null}
      </DialogContent>
    </Dialog.Root>
  );
}
