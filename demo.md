
When AI agents or teams need to pay people, they still copy wallet addresses,
split amounts in a spreadsheet, and hope nothing goes wrong.


Remifi fixes that. It's a hireable agent on CROO  you pay in USDC, describe who gets what in plain English,
 and Remifi handles the rest on Base: verify names, set up splits, and send real USDC with on-chain proof.


Hackathon organizers paying prize pools. DAOs splitting treasury payouts. 
Payroll bots that need one hireable payout leg instead of building their own splitter.

Let me show you.



1. ens lookup 

blockdevrel.base.eth

2. instant usdc pay 

send 0.1 usdc to blockdevrel.base.eth 

3. USDC Split Policy 
split 60% to team at blockdevrel.base.eth and 40% to ops at 0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37

4. USDC Split Execution 

Execute payroll for policy PASTE_POLICY_ID_HERE with 0.1 USDC

5. ENS Payout Identity 

Register org blockdevrel with subname payroll pointing to blockdevrel.base.eth
