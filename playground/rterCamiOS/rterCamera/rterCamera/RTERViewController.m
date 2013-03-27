//
//  rterCameraViewController.m
//  rterCamera
//
//  Created by Stepan Salenikovich on 2013-03-05.
//  Copyright (c) 2013 rtER. All rights reserved.
//

#import "RTERViewController.h"

@interface RTERViewController ()

@end

@implementation RTERViewController

@synthesize userField;
@synthesize passField;
@synthesize cookieString;

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view, typically from a nib.
	userField.delegate = self;
	passField.delegate = self;
	cookieString = @"";
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)startCamera:(id)sender {
    if (![cookieString isEqualToString: @""]) {
		RTERPreviewController *preview = [[RTERPreviewController alloc] init];
		
		preview.delegate = self;
		preview.modalTransitionStyle = UIModalTransitionStyleFlipHorizontal;
		
		[self presentViewController:preview
						   animated:YES
						 completion:nil];
	}
    
}

- (IBAction)login:(id)sender {
	
	// for ASync method
	// NSOperationQueue *opQueue = [[NSOperationQueue alloc] init];
	
	NSLog(@"Attempting auth:\n\t%@\n\t%@", self.userField.text, self.passField.text);
	
	// the json string to post
	NSString *jsonString = [NSString stringWithFormat:@"{\"Username\": \"%@\", \"Password\":\"%@\"}", [self.userField.text stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding], [self.passField.text stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]];
	NSData *postData = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
	
	// setup the request
	NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"http://142.157.58.173:8080/auth"]];
	
	//NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"http://142.157.46.36:1234"]];
	[request setHTTPMethod:@"POST"];
	[request setHTTPShouldHandleCookies:YES];
	[request setHTTPBody:postData];
	[request setAllowsCellularAccess:YES];
	[request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
	[request setValue:[NSString stringWithFormat:@"%d",[postData length]] forHTTPHeaderField:@"Content-Length"];
	
	// post the data - ASync
//	[NSURLConnection sendAsynchronousRequest:request queue:opQueue completionHandler:^(NSURLResponse *urlResponse, NSData * responseData, NSError * responseError) {
//		NSLog(@"%d - %@\n%@", [(NSHTTPURLResponse*)urlResponse statusCode], [NSHTTPURLResponse localizedStringForStatusCode:[(NSHTTPURLResponse*)urlResponse statusCode]], [[(NSHTTPURLResponse*)urlResponse allHeaderFields] description]);
//		if (responseError) {
//			NSLog(@"%@", [responseError description]);
//			NSLog(@"=========Data===========");
//			NSLog(@"%@", [responseData description]);
//		}
//	}];
	
	[NSURLConnection connectionWithRequest:request delegate:self];
	
	//[connection sendSynchronousRequest:request returningResponse:&response error:&httpError];
	//NSLog(@"%d - %@\n%@", [response statusCode], [NSHTTPURLResponse localizedStringForStatusCode:[response statusCode]], [response allHeaderFields]);
	//[connection start];
	
	
	//print the result
//	NSLog(@"========= Other Data ==========");
//	NSLog(@"%d - %@\n%@", [response statusCode], [NSHTTPURLResponse localizedStringForStatusCode:[response statusCode]], [[response allHeaderFields] description]);
//	if (httpError) {
//		NSLog(@"%@", [httpError description]);
//	}
}

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
	NSLog(@"DidRecieveResponse");
	NSLog(@"%d - %@", [(NSHTTPURLResponse*)response statusCode], [NSHTTPURLResponse localizedStringForStatusCode:[(NSHTTPURLResponse*)response statusCode]] );
	NSLog(@"%@", [(NSHTTPURLResponse*)response allHeaderFields]);
	if ([(NSHTTPURLResponse*)response statusCode] == 200) {
		NSDictionary *dict = [(NSHTTPURLResponse*)response allHeaderFields];
		cookieString = [dict valueForKey:@"Set-Cookie"];
		NSLog(@"Set-Cookie: %@", cookieString);
		[self startCamera:nil];
	}
}



- (void)back {
    [self dismissViewControllerAnimated:YES completion: nil];
	cookieString = @"";
}

#pragma mark - UITextFieldDelegate

// for dismissing
- (BOOL) textFieldShouldReturn:(UITextField *)textField {
	if (textField == self.userField) {
		[textField resignFirstResponder];
		[passField becomeFirstResponder];
	} else {
		[textField resignFirstResponder];
		[self login:nil];
	}
	return YES;
}

@end
