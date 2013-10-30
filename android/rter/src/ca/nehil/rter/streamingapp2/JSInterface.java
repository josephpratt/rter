package ca.nehil.rter.streamingapp2;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class JSInterface {
	
	Context mContext;

    /** Instantiate the interface and set the context */
    JSInterface(Context c) {
        mContext = c;
    }

    /** Receive any data from JS. Method called by the JS. */
    @JavascriptInterface
    public void getDataFromJS(String data) {
        Log.d("alok", "received data from JS: " + data);
    }
    
    /** Send any data to the JS. Method called by the JS */
    @JavascriptInterface
    public String sendDataToJS(){
    	String data = "So much data";
    	return data;
    }
    
    /*
     * JS will call a method here (that you'll need to make once the structure of data is decided)
     * that will take two pairs of lat longs (one target and one self) and calculate the angle between them.
     * This will then be returned to JS. 
     * It may also be possible (depending on the code structure and the flow) that this calculation need not be called
     * by the JS and is done before any data is sent to JS. So the Java code would then get the lat long, calculate
     * angle and then send all to JS.
     */
}
