function getGenvmExecutionResult(receipt) {
  const consensus = receipt?.consensus_data ?? receipt?.consensusData ?? {};
  const leaderReceipt = Array.isArray(consensus?.leader_receipt)
    ? consensus.leader_receipt[0]
    : consensus?.leader_receipt ?? receipt?.leader_receipt;
  const txExecutionResult = receipt?.txExecutionResult ?? receipt?.transactionExecutionResult ?? {};
  const executionResult = String(
    leaderReceipt?.execution_result ??
      leaderReceipt?.executionResult ??
      receipt?.txExecutionResultName ??
      txExecutionResult?.name ??
      txExecutionResult?.resultName ??
      receipt?.executionResultName ??
      receipt?.execution_result ??
      ""
  ).toUpperCase();
  const returnStatus = String(
    leaderReceipt?.result?.status ??
      leaderReceipt?.result?.code ??
      leaderReceipt?.result_code ??
      leaderReceipt?.result ??
      txExecutionResult?.status ??
      ""
  ).toUpperCase();
  const error =
    leaderReceipt?.genvm_result?.stderr ??
    leaderReceipt?.error ??
    leaderReceipt?.result?.payload ??
    txExecutionResult?.error ??
    receipt?.error ??
    "";

  if (executionResult === "FINISHED_WITH_RETURN" || executionResult === "SUCCESS" || returnStatus === "RETURN") {
    return { ok: true, detail: executionResult || returnStatus };
  }
  if (
    executionResult === "FINISHED_WITH_ERROR" ||
    executionResult === "ERROR" ||
    executionResult === "FAILURE" ||
    executionResult === "CONTRACT_ERROR" ||
    returnStatus === "CONTRACT_ERROR" ||
    returnStatus === "ERROR"
  ) {
    return { ok: false, detail: typeof error === "string" && error ? error : executionResult || returnStatus };
  }
  return { ok: false, detail: "Transaction finalized, but GenVM execution success was not present in the receipt." };
}

const fixtures = [
  [{ txExecutionResultName: "FINISHED_WITH_RETURN" }, true],
  [{ txExecutionResultName: "FINISHED_WITH_ERROR" }, false],
  [{ consensus_data: { leader_receipt: { execution_result: "SUCCESS" } } }, true],
  [{ consensus_data: { leader_receipt: { execution_result: "ERROR" } } }, false],
  [{ status: "FINALIZED" }, false],
];

for (const [receipt, expected] of fixtures) {
  const actual = getGenvmExecutionResult(receipt).ok;
  if (actual !== expected) {
    throw new Error(`receipt parser expected ${expected} but got ${actual} for ${JSON.stringify(receipt)}`);
  }
}

console.log("receipt parser fixtures: 5 passed");
