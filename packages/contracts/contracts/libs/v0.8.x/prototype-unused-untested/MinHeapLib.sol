// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @notice Library for implementing a min heap data structure in Solidity.
 * Insertion and removal are O(log n) operations, and fit well within block
 * gas limits for millions of nodes. The heap is implemented as an array, and
 * the array is sorted such that the root node is always the minimum value.
 * @dev The library was designed for a study, and is entirely untested and
 * unused. It requires extensive testing and auditing before being used in
 * production.
 */
library MinHeapLib {
    struct MinHeap {
        Node[] heap;
    }

    struct Node {
        // value to rank by
        uint256 value;
        // identifier associated with entry
        // @dev typically used to store unrelated metadata in separate mapping
        bytes32 id;
    }

    // insert new node into heap
    function insert(MinHeap storage minHeap, Node memory node) internal {
        Node[] storage heap = minHeap.heap;
        // insert value at end of array
        heap.push(node);

        uint256 currentIndex = heap.length - 1;
        // base case - heap has one element, and is therfore sorted
        if (currentIndex == 0) {
            return;
        }
        // bubble up to correct position
        // @dev int division rounds down, so no need to floor
        uint256 parentIndex = (currentIndex - 1) / 2;
        while (
            currentIndex > 0 &&
            heap[currentIndex].value < heap[parentIndex].value
        ) {
            // swap parent and child
            // copy parent values to child
            heap[currentIndex].value = heap[parentIndex].value;
            heap[currentIndex].id = heap[parentIndex].id;
            // copy values from child to parent
            // we know the desired node values are the node values input to this function
            heap[parentIndex] = node;

            // update indices
            currentIndex = parentIndex;
            // base case - at top of heap
            if (currentIndex == 0) {
                break;
            }
            parentIndex = (currentIndex - 1) / 2;
        }
    }

    // remove minimum value (root), return removed node in memory
    function removeMin(MinHeap storage minHeap) internal returns (Node memory) {
        Node[] storage heap = minHeap.heap;
        // base case - heap is empty
        if (heap.length == 0) {
            revert("MinHeap: heap is empty");
        }
        // remove root node
        Node memory root = heap[0];
        // replace root with last node
        Node storage rootNode = heap[0];
        rootNode.value = heap[heap.length - 1].value;
        rootNode.id = heap[heap.length - 1].id;
        // delete last node
        heap.pop();
        // load heap length into memory
        uint256 heapLength = heap.length;

        // bubble down to correct position
        uint256 currentIndex = 0;
        uint256 leftChildIndex = 2 * currentIndex + 1;
        uint256 rightChildIndex = 2 * currentIndex + 2;
        // while children still exist and parent is greater than at least one child...
        while (
            (leftChildIndex < heapLength &&
                heap[currentIndex].value > heap[leftChildIndex].value) ||
            (rightChildIndex < heapLength &&
                heap[currentIndex].value > heap[rightChildIndex].value)
        ) {
            // swap parent and child
            // copy child values to parent
            if (
                // if left child is smaller or right child doesn't exist
                heap[leftChildIndex].value < heap[rightChildIndex].value ||
                rightChildIndex >= heap.length
            ) {
                // swap with left child
                // update parent values
                heap[currentIndex].value = heap[leftChildIndex].value;
                heap[currentIndex].id = heap[leftChildIndex].id;
                // update child values
                // we know the desired node values are the root node values brought to root earlier in this function
                heap[leftChildIndex] = root;
                // update current index (child indices are updated below)
                currentIndex = leftChildIndex;
            } else {
                // given prior conditions, right child exists and must be smaller than left child and parent
                // swap with right child
                // update parent values
                heap[currentIndex].value = heap[rightChildIndex].value;
                heap[currentIndex].id = heap[rightChildIndex].id;
                // update child values
                // we know the desired node values are the root node values brought to root earlier in this function
                heap[rightChildIndex] = root;
                // update current index (child indices are updated below)
                currentIndex = rightChildIndex;
            }
            // update child indices
            leftChildIndex = 2 * currentIndex + 1;
            rightChildIndex = 2 * currentIndex + 2;
        }

        return root;
    }

    // getter functions

    // O(1) access to min value (root)
    function peek(
        MinHeap storage minHeap
    ) internal view returns (Node storage) {
        // min is at index 0
        return minHeap.heap[0];
    }

    // O(1) access to num elements
    function numElements(
        MinHeap storage minHeap
    ) internal view returns (uint256) {
        return minHeap.heap.length;
    }

    // O(1) access to heap array
    function getHeapArray(
        MinHeap storage minHeap
    ) internal view returns (Node[] storage) {
        return minHeap.heap;
    }
}
